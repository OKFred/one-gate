import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import mailTemplateService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { mailTemplateData, mailTemplateIndex } from "../db.table";
import { mailTemplateAddLike } from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type mailTemplateAddReqLike = FromSchema<typeof mailTemplateAddReq>;
export type mailTemplateAddResLike = FromSchema<typeof mailTemplateAddRes>;

const mailTemplateAddReq = {
    type: "object",
    properties: {
        ...mailTemplateData,
    } satisfies Partial<Record<keyof mailTemplateAddLike, JSONSchema>>,
    required: ["name", "title", "content", "creatorName"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const mailTemplateAddRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: { ...mailTemplateIndex["id"] },
        message: { type: "string" },
    },
    required: ["ok", "data"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const componentArr = [
    {
        type: "schema",
        name: "mailTemplateAddReq",
        component: mailTemplateAddReq,
    },
    {
        type: "schema",
        name: "mailTemplateAddRes",
        component: mailTemplateAddRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailTemplateAddReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailTemplateAddReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    const id = await mailTemplateService.add(bodyObj);
    if (!id)
        return c.json(
            { ok: false, message: "添加失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: id } satisfies mailTemplateAddResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/add",
    method: "post",
    description: "添加 mailTemplate",
    summary: "添加 mailTemplate",
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
