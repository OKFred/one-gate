import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import loginService from "./service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type refreshTokenReqLike = FromSchema<typeof refreshTokenReq>;
export type refreshTokenResLike = FromSchema<typeof refreshTokenRes>;

const refreshTokenReq = {
    type: "object",
    properties: {
        token: {
            type: "string",
            description: "需要刷新的token",
            examples: ["example-session-token"],
        },
    },
    required: ["token"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const refreshTokenRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: {
            type: "object",
            properties: {
                token: {
                    type: "string",
                    description: "新的token",
                },
            },
            required: ["token"],
            additionalProperties: false,
            nullable: true,
        },
        message: { type: "string" },
    },
    required: ["ok"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const componentArr = [
    {
        type: "schema",
        name: "refreshTokenReq",
        component: refreshTokenReq,
    },
    {
        type: "schema",
        name: "refreshTokenRes",
        component: refreshTokenRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies refreshTokenReqLike;
    const { valid, errors } = validate(
        bodyObj,
        refreshTokenReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    
    const newToken = await loginService.refreshToken(bodyObj.token);
    if (!newToken)
        return c.json(
            { ok: false, message: "token刷新失败，请重新登录", data: null },
            httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
        );
    
    return c.json(
        { ok: true, data: { token: newToken } } satisfies refreshTokenResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/refresh",
    method: "post",
    description: "刷新token",
    summary: "刷新token",
    tags: ["login"],
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
            description: "刷新成功",
            content: {
                "application/json": {
                    schema: {
                        $ref: `#/components/schemas/${componentArr[1].name}`,
                    },
                },
            },
        },
        [httpStatusCode.UNAUTHORIZED as ContentfulStatusCode]: {
            description: "刷新失败",
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
