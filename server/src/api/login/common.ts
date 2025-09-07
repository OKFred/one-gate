import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import loginService from "./service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type commonLoginReqLike = FromSchema<typeof commonLoginReq>;
export type commonLoginResLike = FromSchema<typeof commonLoginRes>;

const commonLoginReq = {
    type: "object",
    properties: {
        username: {
            type: "string",
            description: "用户名",
            examples: ["admin"],
        },
        password: {
            type: "string",
            description: "密码",
            examples: ["password123"],
        },
    },
    required: ["username", "password"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const commonLoginRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: {
            type: "object",
            properties: {
                token: {
                    type: "string",
                    description: "用户token",
                },
                user: {
                    type: "object",
                    properties: {
                        id: {
                            type: "number",
                            description: "用户ID",
                        },
                        username: {
                            type: "string",
                            description: "用户名",
                        },
                        role: {
                            type: "string",
                            description: "角色",
                        },
                        department: {
                            type: "string",
                            description: "部门",
                        },
                        isEnabled: {
                            type: "boolean",
                            description: "是否启用",
                        },
                    },
                    required: ["id", "username", "role", "department", "isEnabled"],
                    additionalProperties: false,
                },
            },
            required: ["token", "user"],
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
        name: "commonLoginReq",
        component: commonLoginReq,
    },
    {
        type: "schema",
        name: "commonLoginRes",
        component: commonLoginRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies commonLoginReqLike;
    const { valid, errors } = validate(
        bodyObj,
        commonLoginReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    
    const loginResult = await loginService.commonLogin(bodyObj);
    if (!loginResult)
        return c.json(
            { ok: false, message: "用户名或密码错误", data: null },
            httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
        );
    
    return c.json(
        { ok: true, data: loginResult } satisfies commonLoginResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/common",
    method: "post",
    description: "普通登录",
    summary: "普通登录",
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
            description: "登录成功",
            content: {
                "application/json": {
                    schema: {
                        $ref: `#/components/schemas/${componentArr[1].name}`,
                    },
                },
            },
        },
        [httpStatusCode.UNAUTHORIZED as ContentfulStatusCode]: {
            description: "登录失败",
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
