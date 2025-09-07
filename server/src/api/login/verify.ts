import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import loginService from "./service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type verifyTokenReqLike = FromSchema<typeof verifyTokenReq>;
export type verifyTokenResLike = FromSchema<typeof verifyTokenRes>;

const verifyTokenReq = {
    type: "object",
    properties: {
        token: {
            type: "string",
            description: "需要验证的token",
            examples: ["example-session-token"],
        },
    },
    required: ["token"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const verifyTokenRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: {
            type: "object",
            properties: {
                valid: {
                    type: "boolean",
                    description: "token是否有效",
                },
                payload: {
                    type: "object",
                    properties: {
                        userId: { type: "number" },
                        username: { type: "string" },
                        role: { type: "string" },
                        department: { type: "string" },
                        exp: { type: "number" },
                    },
                    nullable: true,
                    additionalProperties: false,
                },
            },
            required: ["valid"],
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
        name: "verifyTokenReq",
        component: verifyTokenReq,
    },
    {
        type: "schema",
        name: "verifyTokenRes",
        component: verifyTokenRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies verifyTokenReqLike;
    const { valid, errors } = validate(
        bodyObj,
        verifyTokenReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    
    const payload = await loginService.verifyToken(bodyObj.token);
    const isValid = payload !== null;
    
    return c.json(
        { 
            ok: true, 
            data: { 
                valid: isValid, 
                payload: payload 
            } 
        } satisfies verifyTokenResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/verify",
    method: "post",
    description: "验证token",
    summary: "验证token",
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
            description: "验证完成",
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
