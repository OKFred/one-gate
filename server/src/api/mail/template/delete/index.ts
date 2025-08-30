import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { HTTPException } from "hono/http-exception";
import mailTemplateService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { FromSchema, JSONSchema } from "json-schema-to-ts";
import { mailTemplateIndex, mailTemplateUnique } from "../db.table";

export type mailTemplateDeleteReqLike = FromSchema<
    typeof mailTemplateDeleteReq
>;
export type mailTemplateDeleteResLike = FromSchema<
    typeof mailTemplateDeleteRes
>;

export const mailTemplateDeleteReq = {
    type: "object",
    properties: {
        ...mailTemplateIndex,
        ...mailTemplateUnique,
    },
    required: [] as const,
    oneOf: [{ required: ["id"] }, { required: ["mailAddress"] }],
    additionalProperties: false,
} as const satisfies JSONSchema;

export const mailTemplateDeleteRes = {
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

const componentArr = [
    {
        type: "schema",
        name: "mailTemplateDeleteReq",
        component: mailTemplateDeleteReq,
    },
    {
        type: "schema",
        name: "mailTemplateDeleteRes",
        component: mailTemplateDeleteRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailTemplateDeleteReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailTemplateDeleteReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            { cause: errors },
        );
    const result = await mailTemplateService.delete(bodyObj);
    if (!result)
        return c.json(
            { ok: false, message: "删除失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: result } satisfies mailTemplateDeleteResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/delete",
    method: "post",
    description: "删除 mailTemplate",
    summary: "删除 mailTemplate",
    tags: ["mailTemplate"],
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
