import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import mailAccountService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { mailAccountData, mailAccountIndex } from "../db.table";
import { mailAccountAddLike } from "../db.table";
import { FromSchema, JSONSchema } from "json-schema-to-ts";

export type mailAccountAddReqLike = FromSchema<typeof mailAccountAddReq>;
export type mailAccountAddResLike = FromSchema<typeof mailAccountAddRes>;

const mailAccountAddReq = {
    type: "object",
    properties: {
        ...mailAccountData,
    } satisfies Partial<Record<keyof mailAccountAddLike, JSONSchema>>,
    required: ["mailAddress", "nickname", "password", "accountOwner"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const mailAccountAddRes = {
    type: "object",
    properties: {
        ok: { type: "boolean" },
        data: { ...mailAccountIndex["id"] },
        message: { type: "string" },
    },
    required: ["ok", "data"],
    additionalProperties: false,
} as const satisfies JSONSchema;

const componentArr = [
    {
        type: "schema",
        name: "mailAccountAddReq",
        component: mailAccountAddReq,
    },
    {
        type: "schema",
        name: "mailAccountAddRes",
        component: mailAccountAddRes,
    },
];

const controller = async (c: NodeHonoContext) => {
    const bodyObj = (await c.req.json()) satisfies mailAccountAddReqLike;
    const { valid, errors } = validate(
        bodyObj,
        mailAccountAddReq as object,
        "2020-12",
    );
    if (!valid)
        throw new HTTPException(
            httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
            {
                cause: errors,
            },
        );
    const id = await mailAccountService.add(bodyObj);
    if (!id)
        return c.json(
            { ok: false, message: "添加失败" },
            httpStatusCode.OK as ContentfulStatusCode,
        );
    return c.json(
        { ok: true, data: id } satisfies mailAccountAddResLike,
        httpStatusCode.OK as ContentfulStatusCode,
    );
};

const pathObj = {
    path: "/add",
    method: "post",
    description: "添加 mailAccount",
    summary: "添加 mailAccount",
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
