import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import mailLogService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { mailLogData, mailLogIndex } from "../db.table";
import { mailLogAddLike } from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type mailLogAddReqLike = FromSchema<typeof mailLogAddReq>;
export type mailLogAddResLike = FromSchema<typeof mailLogAddRes>;

const mailLogAddReq = {
    type: "object",
    properties: {
        ...mailLogData,
    } satisfies Partial<Record<keyof mailLogAddLike, JSONSchema>>,
    required: ["mailTo", "mailFrom", "title", "sendStatus"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const mailLogAddRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: { ...mailLogIndex["id"] },
        message: { type: "string" },
    },
    required: ["ok", "data"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const componentArr = [
    {
        type: "schema",
        name: "mailLogAddReq",
        component: mailLogAddReq,
    },
    {
        type: "schema",
        name: "mailLogAddRes",
        component: mailLogAddRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailLogAddReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailLogAddReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    const id = await mailLogService.add(bodyObj);
    if (!id)
        return c.json(
            { ok: false, message: "添加失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: id } satisfies mailLogAddResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/add",
    method: "post",
    description: "添加 mailLog",
    summary: "添加 mailLog",
    tags: ["mailLog"],
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
