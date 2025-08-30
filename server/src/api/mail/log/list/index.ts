import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailLogService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import { mailLogData, mailLogIndex, mailLogTimestamp } from "../db.table";
import { mailLogLike } from "../db.table";

export type mailLogListReqLike = FromSchema<typeof mailLogListReq>;
export type mailLogListResLike = FromSchema<typeof mailLogListRes>;

export const mailLogListReq = {
    type: "object",
    properties: {
        orderBy: {
            type: "string",
            enum: [
                "id",
                "mailTo",
                "mailFrom",
                "createTimeUtc",
            ] satisfies (keyof mailLogLike)[],
        },
        descend: { type: "boolean" },
        pageNo: { type: "number", minimum: 1, default: 1 },
        pageSize: { type: "number", maximum: 1000, default: 10 },
        keyword: { type: "string", examples: [""] },
    },
    required: [],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailLogListRes = {
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
                            ...mailLogIndex,
                            ...mailLogData,
                            ...mailLogTimestamp,
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
        name: "mailLogListReq",
        component: mailLogListReq,
    },
    {
        type: "schema",
        name: "mailLogListRes",
        component: mailLogListRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailLogListReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailLogListReq as object,
        "2020-12",
    );
    if (!valid) throw new HTTPException(422, { cause: errors });
    const listResult = await mailLogService.list(bodyObj);
    if (!listResult)
        return c.json(
            { ok: false, message: "查询失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: listResult } satisfies mailLogListResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/list",
    method: "post",
    description: "查询 mailLog列表",
    summary: "查询 mailLog列表",
    tags: ["mailLog"],
    parameters: [],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/mailLogListReq",
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
                        $ref: "#/components/schemas/mailLogListRes",
                    },
                },
            },
        },
        [httpStatusCode.UNPROCESSABLE_ENTITY]:
            errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
    },
} satisfies RawRouteConfig;

export default { pathObj, controller, componentArr };
