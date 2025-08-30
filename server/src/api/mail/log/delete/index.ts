import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailLogService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import { mailLogIndex, mailLogUnique } from "../db.table";

export type mailLogDeleteReqLike = FromSchema<typeof mailLogDeleteReq>;
export type mailLogDeleteResLike = FromSchema<typeof mailLogDeleteRes>;

export const mailLogDeleteReq = {
    type: "object",
    properties: {
        ...mailLogIndex,
        ...mailLogUnique,
    },
    required: [] as const,
    oneOf: [{ required: ["id"] }, { required: ["mailAddress"] }],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailLogDeleteRes = {
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

const componentArr = [
    {
        type: "schema",
        name: "mailLogDeleteReq",
        component: mailLogDeleteReq,
    },
    {
        type: "schema",
        name: "mailLogDeleteRes",
        component: mailLogDeleteRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailLogDeleteReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailLogDeleteReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            { cause: errors },
        );
    const result = await mailLogService.delete(bodyObj);
    if (!result)
        return c.json(
            { ok: false, message: "删除失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: result } satisfies mailLogDeleteResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/delete",
    method: "post",
    description: "删除 mailLog",
    summary: "删除 mailLog",
    tags: ["mailLog"],
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
