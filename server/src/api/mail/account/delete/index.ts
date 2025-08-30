import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailAccountService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import { mailAccountIndex, mailAccountUnique } from "../db.table";

export type mailAccountDeleteReqLike = FromSchema<typeof mailAccountDeleteReq>;
export type mailAccountDeleteResLike = FromSchema<typeof mailAccountDeleteRes>;

export const mailAccountDeleteReq = {
    type: "object",
    properties: {
        ...mailAccountIndex,
        ...mailAccountUnique,
    },
    required: [] as const,
    oneOf: [{ required: ["id"] }, { required: ["mailAddress"] }],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailAccountDeleteRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: {
            ...mailAccountIndex["id"],
        },
        message: { type: "string" },
    },
    required: ["ok", "data"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const componentArr = [
    {
        type: "schema",
        name: "mailAccountDeleteReq",
        component: mailAccountDeleteReq,
    },
    {
        type: "schema",
        name: "mailAccountDeleteRes",
        component: mailAccountDeleteRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailAccountDeleteReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailAccountDeleteReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            { cause: errors },
        );
    const result = await mailAccountService.delete(bodyObj);
    if (!result)
        return c.json(
            { ok: false, message: "删除失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: result } satisfies mailAccountDeleteResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/delete",
    method: "post",
    description: "删除 mailAccount",
    summary: "删除 mailAccount",
    tags: ["mailAccount"],
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
