import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailTemplateService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import {
    mailTemplateData,
    mailTemplateIndex,
    mailTemplateTimestamp,
} from "../db.table";
import { mailTemplateLike } from "../db.table";

export type mailTemplateListReqLike = FromSchema<typeof mailTemplateListReq>;
export type mailTemplateListResLike = FromSchema<typeof mailTemplateListRes>;

export const mailTemplateListReq = {
    type: "object",
    properties: {
        orderBy: {
            type: "string",
            enum: [
                "id",
                "langCode",
                "creatorName",
                "category",
                "createTimeUtc",
            ] satisfies (keyof mailTemplateLike)[],
        },
        descend: { type: "boolean" },
        pageNo: { type: "number", minimum: 1, default: 1 },
        pageSize: { type: "number", maximum: 1000, default: 10 },
        keyword: { type: "string", examples: [""] },
    },
    required: [],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailTemplateListRes = {
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
                            ...mailTemplateIndex,
                            ...mailTemplateData,
                            ...mailTemplateTimestamp,
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
        name: "mailTemplateListReq",
        component: mailTemplateListReq,
    },
    {
        type: "schema",
        name: "mailTemplateListRes",
        component: mailTemplateListRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailTemplateListReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailTemplateListReq as object,
        "2020-12",
    );
    if (!valid) throw new HTTPException(422, { cause: errors });
    const listResult = await mailTemplateService.list(bodyObj);
    if (!listResult)
        return c.json(
            { ok: false, message: "查询失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: listResult } satisfies mailTemplateListResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/list",
    method: "post",
    description: "查询 mailTemplate列表",
    summary: "查询 mailTemplate列表",
    tags: ["mailTemplate"],
    parameters: [],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/mailTemplateListReq",
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
                        $ref: "#/components/schemas/mailTemplateListRes",
                    },
                },
            },
        },
        [httpStatusCode.UNPROCESSABLE_ENTITY]:
            errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
    },
} satisfies RawRouteConfig;

export default { pathObj, controller, componentArr };
