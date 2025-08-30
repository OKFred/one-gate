import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailAccountService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import {
    mailAccountData,
    mailAccountIndex,
    mailAccountTimestamp,
} from "../db.table";
import { mailAccountLike } from "../db.table";

export type mailAccountListReqLike = FromSchema<typeof mailAccountListReq>;
export type mailAccountListResLike = FromSchema<typeof mailAccountListRes>;

export const mailAccountListReq = {
    type: "object",
    properties: {
        orderBy: {
            type: "string",
            enum: [
                "id",
                "accountOwner",
                "createTimeUtc",
            ] satisfies (keyof mailAccountLike)[],
        },
        descend: { type: "boolean" },
        pageNo: { type: "number", minimum: 1, default: 1 },
        pageSize: { type: "number", maximum: 1000, default: 10 },
        keyword: { type: "string", examples: [""] },
    },
    required: [],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailAccountListRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: {
            type: "object",
            properties: {
                list: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            ...mailAccountIndex,
                            ...mailAccountData,
                            ...mailAccountTimestamp,
                        },
                        additionalProperties: false,
                    },
                },
                total: { type: "number" },
                currentPage: { type: "number" },
                totalPage: { type: "number" },
                pageNo: { type: "number", minimum: 1 },
                pageSize: { type: "number", maximum: 1000 },
            },
            required: ["list"],
            additionalProperties: false,
        },
        message: { type: "string" },
    },
    required: ["ok", "data"],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const componentArr = [
    {
        type: "schema",
        name: "mailAccountListReq",
        component: mailAccountListReq,
    },
    {
        type: "schema",
        name: "mailAccountListRes",
        component: mailAccountListRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailAccountListReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailAccountListReq as object,
        "2020-12",
    );
    if (!valid) throw new HTTPException(422, { cause: errors });
    const listResult = await mailAccountService.list(bodyObj);
    if (!listResult)
        return c.json(
            { ok: false, message: "查询失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: listResult } satisfies mailAccountListResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/list",
    method: "post",
    description: "查询 mailAccount列表",
    summary: "查询 mailAccount列表",
    tags: ["mailAccount"],
    parameters: [],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/mailAccountListReq",
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
                        $ref: "#/components/schemas/mailAccountListRes",
                    },
                },
            },
        },
        [httpStatusCode.UNPROCESSABLE_ENTITY]:
            errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
    },
} satisfies RawRouteConfig;

export default { pathObj, controller, componentArr };
