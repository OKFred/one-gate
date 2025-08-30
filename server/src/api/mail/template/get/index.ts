import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailTemplateService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import {
  mailTemplateData,
  mailTemplateIndex,
  mailTemplateTimestamp,
  mailTemplateUnique,
} from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type mailTemplateGetReqLike = FromSchema<typeof mailTemplateGetReq>;
export type mailTemplateGetResLike = FromSchema<typeof mailTemplateGetRes>;

export const mailTemplateGetReq = {
  type: "object",
  properties: {
    ...mailTemplateIndex,
    ...mailTemplateUnique,
  },
  required: [],
  oneOf: [{ required: ["id"] }, { required: ["mailAddress"] }],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const mailTemplateGetRes = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    data: {
      type: "object",
      properties: {
        ...mailTemplateIndex,
        ...mailTemplateData,
        ...mailTemplateTimestamp,
      },
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
    name: "mailTemplateGetReq",
    component: mailTemplateGetReq,
  },
  {
    type: "schema",
    name: "mailTemplateGetRes",
    component: mailTemplateGetRes,
  },
];

const controller = async (c: NodeHonoContext) => {
  const bodyObj = (await c.req.json()) as mailTemplateGetReqLike;
  const { valid, errors } = validate(
    bodyObj,
    mailTemplateGetReq as object,
    "2020-12",
  );
  if (!valid) throw new HTTPException(422, { cause: errors });
  const row = await mailTemplateService.get(bodyObj);
  if (!row?.id)
    throw new HTTPException(404, { cause: "未找到该 mailTemplate" });
  return c.json(
    { ok: true, data: row } satisfies mailTemplateGetResLike,
    httpStatusCode.OK as ContentfulStatusCode,
  );
};

const pathObj = {
  path: "/get",
  method: "post",
  description: "查询 mailTemplate",
  summary: "查询 mailTemplate",
  tags: ["mailTemplate"],
  parameters: [],
  requestBody: {
    required: true,
    description: "查询 mailTemplate",
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
