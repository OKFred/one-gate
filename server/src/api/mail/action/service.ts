import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import mailAccountService from "../account/service";
import mailTemplateService from "../template/service";
import mailLogService from "../log/service";

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
  obj: FromSchema<typeof sendReq>
): Promise<FromSchema<typeof sendRes>> {
  const { accountId, templateId, receiverArr, subject, html, templateParams } =
    obj;

  // 1. 获取邮件账户信息
  const accountObj = await mailAccountService.get.service({ id: accountId });
  if (!accountObj) {
    throw new Error("未找到该邮件账户");
  }

  // 2. 如果提供了模板ID，获取模板内容
  let finalSubject = subject || "";
  let finalHtml = html || "";
  let finalTemplateId: string | undefined = undefined;
  let finalTemplateParams: string | undefined = undefined;

  if (templateId) {
    const template = await mailTemplateService.get.service({ id: templateId });
    if (!template) {
      throw new Error("未找到该邮件模板");
    }
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

  // 3. 验证必填字段
  if (!finalSubject || !finalHtml) {
    throw new Error("邮件主题和内容不能为空，请提供 subject 和 html 或 templateId");
  }

  // 4. 发送邮件
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: accountObj.host,
    port: accountObj.port,
    secure: accountObj.sslEnable,
    auth: {
      user: accountObj.mailAddress,
      pass: accountObj.password,
    },
  });

  let sendStatus = false;
  let exceptionCode: string | undefined = undefined;
  let exceptionDetails: string | undefined = undefined;
  let accepted: { name: string; address: string }[] = [];
  let rejected: { name: string; address: string }[] = [];

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
    exceptionCode = error.code || "UNKNOWN_ERROR";
    exceptionDetails = error.response || error.message || "Unknown error";
    // 即使发送失败，也继续记录日志
  }

  // 5. 记录日志
  const logId = await mailLogService.add.service({
    title: finalSubject,
    mailTo: receiverArr.map((item) => item.address).join(";"),
    mailFrom: accountObj.mailAddress,
    sendStatus,
    templateId: finalTemplateId,
    templateParams: finalTemplateParams,
    exceptionCode,
    exceptionDetails,
  });

  // 6. 如果发送失败，抛出错误
  if (!sendStatus) {
    throw new Error(exceptionDetails || "邮件发送失败");
  }

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
  service: onSend,
};

export default {
  send: sendApi,
};
