import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailLogService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import {
  mailLogData,
  mailLogIndex,
  mailLogTimestamp,
  mailLogUnique,
} from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type mailLogGetReqLike = FromSchema<typeof mailLogGetReq>;
export type mailLogGetResLike = FromSchema<typeof mailLogGetRes>;

export const mailLogGetReq = {
  type: "object",
  properties: {
    ...mailLogIndex,
    ...mailLogUnique,
  },
  required: [],
  oneOf: [{ required: ["id"] }, { required: ["mailAddress"] }],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const mailLogGetRes = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    data: {
      type: "object",
      properties: {
        ...mailLogIndex,
        ...mailLogData,
        ...mailLogTimestamp,
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
    name: "mailLogGetReq",
    component: mailLogGetReq,
  },
  {
    type: "schema",
    name: "mailLogGetRes",
    component: mailLogGetRes,
  },
];

const controller = async (c: NodeHonoContext) => {
  const bodyObj = (await c.req.json()) as mailLogGetReqLike;
  const { valid, errors } = validate(
    bodyObj,
    mailLogGetReq as object,
    "2020-12",
  );
  if (!valid) throw new HTTPException(422, { cause: errors });
  const row = await mailLogService.get(bodyObj);
  if (!row?.id) throw new HTTPException(404, { cause: "未找到该 mailLog" });
  return c.json(
    { ok: true, data: row } satisfies mailLogGetResLike,
    httpStatusCode.OK as ContentfulStatusCode,
  );
};

const pathObj = {
  path: "/get",
  method: "post",
  description: "查询 mailLog",
  summary: "查询 mailLog",
  tags: ["mailLog"],
  parameters: [],
  requestBody: {
    required: true,
    description: "查询 mailLog",
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
