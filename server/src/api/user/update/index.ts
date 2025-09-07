import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import userService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { userIndex, userData } from "../db.table";
import { userAddLike } from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type userUpdateReqLike = FromSchema<typeof userUpdateReq>;
export type userUpdateResLike = FromSchema<typeof userUpdateRes>;

const userUpdateReq = {
    type: "object",
    properties: {
        ...userIndex,
        ...userData,
    } satisfies Partial<Record<keyof userAddLike, JSONSchema>>,
    required: ["id"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const userUpdateRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: { ...userIndex["id"] },
        message: { type: "string" },
    },
    required: ["ok"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const componentArr = [
    {
        type: "schema",
        name: "userUpdateReq",
        component: userUpdateReq,
    },
    {
        type: "schema",
        name: "userUpdateRes",
        component: userUpdateRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies userUpdateReqLike;
    const { valid, errors } = validate(
        bodyObj,
        userUpdateReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    const id = await userService.update(bodyObj);
    if (!id)
        return c.json(
            { ok: false, message: "更新失败", data: null },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: id } satisfies userUpdateResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/update",
    method: "post",
    description: "更新用户",
    summary: "更新用户",
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
