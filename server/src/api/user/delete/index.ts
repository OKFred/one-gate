import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import userService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { userIndex, userUnique } from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type userDeleteReqLike = FromSchema<typeof userDeleteReq>;
export type userDeleteResLike = FromSchema<typeof userDeleteRes>;

const userDeleteReq = {
    type: "object",
    properties: {
        ...userIndex,
        ...userUnique,
    },
    additionalProperties: false,
} as const satisfies JSONSchema;

const userDeleteRes = {
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
        name: "userDeleteReq",
        component: userDeleteReq,
    },
    {
        type: "schema",
        name: "userDeleteRes",
        component: userDeleteRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies userDeleteReqLike;
    const { valid, errors } = validate(
        bodyObj,
        userDeleteReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    const id = await userService.delete(bodyObj);
    if (!id)
        return c.json(
            { ok: false, message: "删除失败", data: null },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: id } satisfies userDeleteResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/delete",
    method: "post",
    description: "删除用户",
    summary: "删除用户",
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
