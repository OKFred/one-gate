import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@/types/app";
import mailAccountService from "../account/service";
import mailTemplateService from "../template/service";
import mailLogService from "../log/service";
import {
  bodyUserAdapter,
  bodyAdapter,
} from "@/middleware/encapsulation/adapter";
import { getRuntimeKey } from "hono/adapter";
import { preventEmpty } from "@/middleware/auth/prevention";
import { preventSendFailure } from "./prevention";

const sendReq = {
  type: "object",
  properties: {
    accountId: {
      type: "number",
      description: "邮箱账号ID",
      examples: [1],
    },
    templateId: {
      type: "number",
      description: "邮件模板ID（可选，如果提供则使用模板内容）",
      examples: [1],
    },
    receiverArr: {
      type: "array",
      description: "收件人列表",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "收件人名称" },
          address: {
            type: "string",
            format: "email",
            description: "收件人邮箱地址",
          },
        },
        required: ["name", "address"] as const,
        additionalProperties: false,
      },
      minItems: 1,
    },
    subject: {
      type: "string",
      description: "邮件主题（如果使用模板则可选）",
      examples: ["Welcome to our service!"],
    },
    html: {
      type: "string",
      description: "邮件HTML内容（如果使用模板则可选）",
    },
    templateParams: {
      type: "object",
      description: "模板参数（JSON对象，用于替换模板中的变量）",
      additionalProperties: true,
    },
  },
  required: ["accountId", "receiverArr"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const sendRes = {
  type: "object",
  properties: {
    accepted: {
      type: "array",
      description: "成功接收的邮箱地址列表",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
        },
        required: ["name", "address"],
        additionalProperties: false,
      },
    },
    rejected: {
      type: "array",
      description: "拒绝接收的邮箱地址列表",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
        },
        required: ["name", "address"],
        additionalProperties: false,
      },
    },
    logId: {
      type: "number",
      description: "邮件日志ID",
    },
  },
  required: ["accepted", "rejected", "logId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onSend(
  bodyObj: FromSchema<typeof sendReq>,
  userObj: UserObj
): Promise<FromSchema<typeof sendRes>> {
  const { accountId, templateId, receiverArr, subject, html, templateParams } =
    bodyObj;

  // 1. 获取邮件账户信息
  const accountObj = await mailAccountService.get.service({ id: accountId });
  preventEmpty(accountObj);

  // 2. 如果提供了模板ID，获取模板内容
  let finalSubject = subject || "";
  let finalHtml = html || "";
  let finalTemplateId: string | undefined = undefined;
  let finalTemplateParams: string | undefined = undefined;

  if (templateId) {
    const template = await mailTemplateService.get.service({ id: templateId });
    preventEmpty(template);
    finalSubject = template.title;
    finalHtml = template.content;
    finalTemplateId = String(templateId);

    // 如果提供了模板参数，进行替换
    if (templateParams) {
      finalTemplateParams = JSON.stringify(templateParams);
      // 简单的模板变量替换 {{variable}}
      Object.entries(templateParams).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        finalHtml = finalHtml.replace(regex, String(value));
        finalSubject = finalSubject.replace(regex, String(value));
      });
    }
  }

  let sendStatus = false;
  let exceptionCode: string | undefined = undefined;
  let exceptionDetails: string | undefined = undefined;
  let accepted: { name: string; address: string }[] = [];
  let rejected: { name: string; address: string }[] = [];

  const runtime = getRuntimeKey();

  if (runtime === "workerd") {
    // Cloudflare Workers 运行环境：使用 worker-mailer
    try {
      const { WorkerMailer } = await import("worker-mailer");
      await WorkerMailer.send(
        {
          host: accountObj.host,
          port: accountObj.port,
          authType: "plain",
          secure: [465, 587].includes(accountObj.port),
          startTls: [587].includes(accountObj.port),
          credentials: {
            username: accountObj.mailAddress,
            password: accountObj.password,
          },
        },
        {
          from: {
            name: accountObj.nickname || accountObj.mailAddress,
            email: accountObj.mailAddress,
          },
          to: receiverArr.map((r) => ({ name: r.name, email: r.address })),
          subject: finalSubject,
          html: finalHtml,
        }
      );

      // worker-mailer 目前返回的是 boolean 或具体信息，这里假设发送成功即进入 accepted
      // 注意：worker-mailer 的 send 返回结构可能根据版本不同，这里先统一映射
      accepted = receiverArr.map((r) => ({ name: r.name, address: r.address }));
      sendStatus = true;
    } catch (error: any) {
      sendStatus = false;
      exceptionCode = error.code || "WORKER_MAILER_ERROR";
      exceptionDetails =
        error.stack || error.message || "Unknown error in Workers mailer";
    }
  } else {
    // Node.js 运行环境：保持使用 nodemailer
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: accountObj.host,
      port: accountObj.port,
      secure: accountObj.port === 465, // true for 465, false for other ports
      auth: {
        user: accountObj.mailAddress,
        pass: accountObj.password,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: {
          name: accountObj.nickname || accountObj.mailAddress,
          address: accountObj.mailAddress,
        },
        to: receiverArr,
        subject: finalSubject,
        html: finalHtml,
      });

      accepted = info.accepted.map((address) => {
        if (typeof address === "string") {
          return { name: address, address };
        }
        return address as { name: string; address: string };
      });

      rejected = info.rejected.map((address) => {
        if (typeof address === "string") {
          return { name: address, address };
        }
        return address as { name: string; address: string };
      });

      sendStatus = true;
    } catch (error: any) {
      sendStatus = false;
      exceptionCode = error.code || "NODEMAILER_ERROR";
      exceptionDetails =
        error.response || error.message || "Unknown error in Node mailer";
    }
  }

  // 5. 记录日志
  const logId = await mailLogService.add.service(
    {
      templateId: finalTemplateId,
      templateParams: finalTemplateParams,
      title: finalSubject,
      mailTo: receiverArr.map((r) => r.address).join(", "),
      mailFrom: accountObj.mailAddress,
      sendStatus,
      exceptionCode,
      exceptionDetails,
    },
    userObj
  );

  // 6. 如果发送失败，抛出错误
  preventSendFailure(sendStatus, exceptionDetails);

  return {
    accepted,
    rejected,
    logId: logId || 0,
  };
}

const sendApi = {
  req: sendReq,
  res: sendRes,
  pathInfo: {
    path: "/send",
    method: "post",
    summary: "发送邮件",
  } as const,
  adapter: bodyUserAdapter,
  service: onSend,
  permission: { action: "add" },
};

const verifyReq = {
  type: "object",
  properties: {
    accountId: {
      type: "number",
      description: "邮箱账号ID",
      examples: [1],
    },
  },
  required: ["accountId"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

const verifyRes = {
  type: "boolean",
  description: "验证结果，true 表示验证成功",
} as const satisfies JSONSchema;

async function onVerify(
  bodyObj: FromSchema<typeof verifyReq>
): Promise<FromSchema<typeof verifyRes>> {
  const { accountId } = bodyObj;

  const accountObj = await mailAccountService.get.service({ id: accountId });
  preventEmpty(accountObj);
  const runtime = getRuntimeKey();
  if (runtime === "workerd") {
    // Cloudflare Workers 运行环境
    try {
      const { WorkerMailer } = await import("worker-mailer");
      const mailer = await WorkerMailer.connect({
        host: accountObj.host,
        port: accountObj.port,
        authType: "plain",
        secure: [465, 587].includes(accountObj.port),
        startTls: [587].includes(accountObj.port),
        credentials: {
          username: accountObj.mailAddress,
          password: accountObj.password,
        },
      });
      return true;
    } catch (error: any) {
      // cannot connect to the specified address
      // 526 Authentication failure
      throw error;
    }
  } else {
    // Node.js 运行环境
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: accountObj.host,
      port: accountObj.port,
      secure: accountObj.port === 465, // true for 465, false for other ports
      auth: {
        user: accountObj.mailAddress,
        pass: accountObj.password,
      },
    });

    await transporter.verify();
    return true;
  }
}

const verifyApi = {
  req: verifyReq,
  res: verifyRes,
  pathInfo: {
    path: "/verify",
    method: "post",
    summary: "验证邮件账户",
  } as const,
  adapter: bodyAdapter,
  service: onVerify,
  permission: { action: "read" },
};

export default {
  send: sendApi,
  verify: verifyApi,
};
