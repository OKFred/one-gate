import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailAccountService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { mailAccountData, mailAccountIndex } from "../db.table";

export type mailAccountUpdateReqLike = FromSchema<typeof mailAccountUpdateReq>;
export type mailAccountUpdateResLike = FromSchema<typeof mailAccountUpdateRes>;

export const mailAccountUpdateReq = {
    type: "object",
    properties: {
        ...mailAccountIndex,
        ...mailAccountData,
    },
    required: ["id"],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailAccountUpdateRes = {
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

export const componentArr = [
    {
        type: "schema",
        name: "mailAccountUpdateReq",
        component: mailAccountUpdateReq,
    },
    {
        type: "schema",
        name: "mailAccountUpdateRes",
        component: mailAccountUpdateRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailAccountUpdateReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailAccountUpdateReq as object,
        "2020-12",
    );
    if (!valid) throw new HTTPException(422, { cause: errors });
    const result = await mailAccountService.update(bodyObj);
    if (!result)
        return c.json(
            { ok: false, message: "更新失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: result } satisfies mailAccountUpdateResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/update",
    method: "post",
    description: "更新 mailAccount",
    summary: "更新 mailAccount",
    tags: ["mailAccount"],
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
