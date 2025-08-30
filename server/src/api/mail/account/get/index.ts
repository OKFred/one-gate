import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailAccountService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import {
    mailAccountData,
    mailAccountIndex,
    mailAccountTimestamp,
    mailAccountUnique,
} from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type mailAccountGetReqLike = FromSchema<typeof mailAccountGetReq>;
export type mailAccountGetResLike = FromSchema<typeof mailAccountGetRes>;

export const mailAccountGetReq = {
    type: "object",
    properties: {
        ...mailAccountIndex,
        ...mailAccountUnique,
    },
    required: [],
    oneOf: [{ required: ["id"] }, { required: ["mailAddress"] }],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailAccountGetRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: {
            type: "object",
            properties: {
                ...mailAccountIndex,
                ...mailAccountData,
                ...mailAccountTimestamp,
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
        name: "mailAccountGetReq",
        component: mailAccountGetReq,
    },
    {
        type: "schema",
        name: "mailAccountGetRes",
        component: mailAccountGetRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) as mailAccountGetReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailAccountGetReq as object,
        "2020-12",
    );
    if (!valid) throw new HTTPException(422, { cause: errors });
    const row = await mailAccountService.get(bodyObj);
    if (!row?.id)
        throw new HTTPException(404, { cause: "未找到该 mailAccount" });
    return c.json(
        { ok: true, data: row } satisfies mailAccountGetResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/get",
    method: "post",
    description: "查询 mailAccount",
    summary: "查询 mailAccount",
    tags: ["mailAccount"],
    parameters: [],
    requestBody: {
        required: true,
        description: "查询 mailAccount",
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
