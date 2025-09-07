import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import userService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { userData, userIndex } from "../db.table";
import { userAddLike } from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type userAddReqLike = FromSchema<typeof userAddReq>;
export type userAddResLike = FromSchema<typeof userAddRes>;

const userAddReq = {
    type: "object",
    properties: {
        ...userData,
    } satisfies Partial<Record<keyof userAddLike, JSONSchema>>,
    required: ["username", "password", "department", "role"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const userAddRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: { ...userIndex["id"] },
        message: { type: "string" },
    },
    required: ["ok", "data"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const componentArr = [
    {
        type: "schema",
        name: "userAddReq",
        component: userAddReq,
    },
    {
        type: "schema",
        name: "userAddRes",
        component: userAddRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies userAddReqLike;
    const { valid, errors } = validate(
        bodyObj,
        userAddReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    const id = await userService.add(bodyObj);
    if (!id)
        return c.json(
            { ok: false, message: "添加失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: id } satisfies userAddResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/add",
    method: "post",
    description: "添加用户",
    summary: "添加用户",
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
