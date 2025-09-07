import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import userService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import {
    userData,
    userIndex,
    userTimestamp,
} from "../db.table";
import { userLike } from "../db.table";

export type userListReqLike = FromSchema<typeof userListReq>;
export type userListResLike = FromSchema<typeof userListRes>;

export const userListReq = {
    type: "object",
    properties: {
        orderBy: {
            type: "string",
            enum: [
                "id",
                "username",
                "department",
                "role",
                "createTimeUtc",
            ] satisfies (keyof userLike)[],
        },
        descend: { type: "boolean" },
        pageNo: { type: "number", minimum: 1, default: 1 },
        pageSize: { type: "number", maximum: 1000, default: 10 },
        keyword: { type: "string", examples: [""] },
    },
    required: [],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const userListRes = {
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
                            ...userIndex,
                            username: userData.username,
                            department: userData.department,
                            role: userData.role,
                            isEnabled: userData.isEnabled,
                            ...userTimestamp,
                            // 注意：列表中不包含密码字段
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
        name: "userListReq",
        component: userListReq,
    },
    {
        type: "schema",
        name: "userListRes",
        component: userListRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies userListReqLike;
    const { valid, errors } = validate(
        bodyObj,
        userListReq as object,
        "2020-12",
    );
    if (!valid) throw new HTTPException(422, { cause: errors });
    const listResult = await userService.list(bodyObj);
    if (!listResult)
        return c.json(
            { ok: false, message: "查询失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: listResult } satisfies userListResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/list",
    method: "post",
    description: "查询用户列表",
    summary: "查询用户列表",
    tags: ["user"],
    parameters: [],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    $ref: "#/components/schemas/userListReq",
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
                        $ref: "#/components/schemas/userListRes",
                    },
                },
            },
        },
        [httpStatusCode.UNPROCESSABLE_ENTITY]:
            errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
    },
} satisfies RawRouteConfig;

export default { pathObj, controller, componentArr };
