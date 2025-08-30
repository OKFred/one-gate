import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailLogService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { mailLogData, mailLogIndex } from "../db.table";

export type mailLogUpdateReqLike = FromSchema<typeof mailLogUpdateReq>;
export type mailLogUpdateResLike = FromSchema<typeof mailLogUpdateRes>;

export const mailLogUpdateReq = {
    type: "object",
    properties: {
        ...mailLogIndex,
        ...mailLogData,
    },
    required: ["id"],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailLogUpdateRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: {
            ...mailLogIndex["id"],
        },
        message: { type: "string" },
    },
    required: ["ok", "data"],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const componentArr = [
    {
        type: "schema",
        name: "mailLogUpdateReq",
        component: mailLogUpdateReq,
    },
    {
        type: "schema",
        name: "mailLogUpdateRes",
        component: mailLogUpdateRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailLogUpdateReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailLogUpdateReq as object,
        "2020-12",
    );
    if (!valid) throw new HTTPException(422, { cause: errors });
    const result = await mailLogService.update(bodyObj);
    if (!result)
        return c.json(
            { ok: false, message: "更新失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: result } satisfies mailLogUpdateResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/update",
    method: "post",
    description: "更新 mailLog",
    summary: "更新 mailLog",
    tags: ["mailLog"],
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
