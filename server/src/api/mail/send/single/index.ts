import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import mailSendService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import mailAccountService from "../../account/service";
import mailTemplateService from "../../template/service";
import mailLogService from "../../log/service";

export type mailSendSingleReqLike = FromSchema<typeof mailSendSingleReq>;
export type mailSendSingleResLike = FromSchema<typeof mailSendSingleRes>;

const mailSendSingleReq = {
  type: "object",
  properties: {
    senderObj: {
      type: "object",
      properties: {
        accountId: { type: "number" },
        mailAddress: { type: "string" },
      },
      oneOf: [{ required: ["accountId"] }, { required: ["mailAddress"] }],
    },
    receiverArr: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
        },
        required: ["name", "address"] as const,
        additionalProperties: false,
      },
    },
    contentObj: {
      type: "object",
      properties: {
        templateId: { type: "number" },
        subject: { type: "string" },
        html: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  required: ["senderObj", "receiverArr", "contentObj"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const mailSendSingleRes = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    data: {
      type: "object",
      properties: {
        accepted: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
            },
            required: ["name", "address"] as const,
            additionalProperties: false,
          },
        },
        rejected: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
            },
            required: ["name", "address"] as const,
            additionalProperties: false,
          },
        },
      },
      required: ["accepted", "rejected"] as const,
      additionalProperties: false,
    },
    message: { type: "string" },
  },
  required: ["ok", "data"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const componentArr = [
  {
    type: "schema",
    name: "mailSendSingleReq",
    component: mailSendSingleReq,
  },
  {
    type: "schema",
    name: "mailSendSingleRes",
    component: mailSendSingleRes,
  },
];

const controller = async (c: NodeHonoContext) => {
  const bodyObj = (await c.req.json()) as mailSendSingleReqLike;
  const { valid, errors } = validate(
    bodyObj,
    mailSendSingleReq as object,
    "2020-12",
  );
  if (!valid)
    throw new HTTPException(
      httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
      {
        cause: errors,
      },
    );
  const { senderObj, receiverArr, contentObj } = bodyObj;
  const { accountId, mailAddress } = senderObj;
  const { templateId } = contentObj;
  const accountObj = await mailAccountService.get({
    id: accountId,
    mailAddress,
  });
  if (!accountObj) {
    return c.json(
      { ok: false, message: "未找到该邮件账户" },
      httpStatusCode.OK as ContentfulStatusCode,
    );
  }
  if (templateId) {
    const template = await mailTemplateService.get({ id: templateId });
    if (!template) {
      return c.json(
        { ok: false, message: "未找到该邮件模板" },
        httpStatusCode.OK as ContentfulStatusCode,
      );
    }
    contentObj.subject = template.title;
    contentObj.html = template.content;
  }
  try {
    const result = await mailSendService.send(
      accountObj,
      receiverArr,
      contentObj,
    );
    const mailLog = await mailLogService.add({
      title: contentObj.subject || "",
      mailTo: receiverArr.map((item) => item.address).join(";"),
      mailFrom: accountObj.mailAddress,
      sendStatus: true,
    });
    c.var.logger.info("Mail log added:" + mailLog);
    return c.json(
      { ok: true, data: result } satisfies mailSendSingleResLike,
      httpStatusCode.OK as ContentfulStatusCode,
    );
  } catch (e) {
    if (e.response) {
      const mailLog = await mailLogService.add({
        title: contentObj.subject || "",
        mailTo: receiverArr.map((item) => item.address).join(";"),
        mailFrom: accountObj.mailAddress,
        sendStatus: false,
        exceptionCode: e.code,
        exceptionDetails: e.response,
      });
      c.var.logger.info("Mail log added:" + mailLog);
      return c.json(
        { ok: false, message: e.response },
        httpStatusCode.OK as ContentfulStatusCode,
      );
    } else {
      return c.json(
        { ok: false, message: (e as Error).message },
        httpStatusCode.OK as ContentfulStatusCode,
      );
    }
  }
};

const pathObj = {
  path: "/single",
  method: "post",
  description: "单个 mailSend",
  summary: "单个 mailSend",
  tags: ["mailSend"],
  parameters: [],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          $ref: `#/components/schemas/${componentArr[0].name}`,
        },
      },
    },
  },
  responses: {
    [httpStatusCode.OK as ContentfulStatusCode]: {
      description: "成功",
      content: {
        "application/json": {
          schema: {
            $ref: `#/components/schemas/${componentArr[1].name}`,
          },
        },
      },
    },
    [httpStatusCode.UNPROCESSABLE_ENTITY]:
      errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
  },
} satisfies RawRouteConfig;

export default { pathObj, controller, componentArr };
