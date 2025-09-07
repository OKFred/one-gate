import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import userService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { userIndex, userUnique, userData, userTimestamp } from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type userGetReqLike = FromSchema<typeof userGetReq>;
export type userGetResLike = FromSchema<typeof userGetRes>;

const userGetReq = {
    type: "object",
    properties: {
        ...userIndex,
        ...userUnique,
    },
    additionalProperties: false,
} as const satisfies JSONSchema;

const userGetRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: {
            type: "object",
            properties: {
                ...userIndex,
                username: userData.username,
                department: userData.department,
                role: userData.role,
                isEnabled: userData.isEnabled,
                ...userTimestamp,
                // 注意：不包含密码字段
            },
            nullable: true,
            additionalProperties: false,
        },
        message: { type: "string" },
    },
    required: ["ok"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const componentArr = [
    {
        type: "schema",
        name: "userGetReq",
        component: userGetReq,
    },
    {
        type: "schema",
        name: "userGetRes",
        component: userGetRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies userGetReqLike;
    const { valid, errors } = validate(
        bodyObj,
        userGetReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    const result = await userService.get(bodyObj);
    if (!result)
        return c.json(
            { ok: false, message: "未找到用户", data: null },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: result } satisfies userGetResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/get",
    method: "post",
    description: "获取用户详情",
    summary: "获取用户详情",
    tags: ["user"],
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
