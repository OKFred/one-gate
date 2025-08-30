import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailTemplateService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { mailTemplateData, mailTemplateIndex } from "../db.table";

export type mailTemplateUpdateReqLike = FromSchema<
    typeof mailTemplateUpdateReq
>;
export type mailTemplateUpdateResLike = FromSchema<
    typeof mailTemplateUpdateRes
>;

export const mailTemplateUpdateReq = {
    type: "object",
    properties: {
        ...mailTemplateIndex,
        ...mailTemplateData,
    },
    required: ["id"],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailTemplateUpdateRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: {
            ...mailTemplateIndex["id"],
        },
        message: { type: "string" },
    },
    required: ["ok", "data"],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const componentArr = [
    {
        type: "schema",
        name: "mailTemplateUpdateReq",
        component: mailTemplateUpdateReq,
    },
    {
        type: "schema",
        name: "mailTemplateUpdateRes",
        component: mailTemplateUpdateRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailTemplateUpdateReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailTemplateUpdateReq as object,
        "2020-12",
    );
    if (!valid) throw new HTTPException(422, { cause: errors });
    const result = await mailTemplateService.update(bodyObj);
    if (!result)
        return c.json(
            { ok: false, message: "更新失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: result } satisfies mailTemplateUpdateResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/update",
    method: "post",
    description: "更新 mailTemplate",
    summary: "更新 mailTemplate",
    tags: ["mailTemplate"],
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
