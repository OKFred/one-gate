import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import mailAccountService from "../service";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { mailAccountGetReq, mailAccountGetRes } from "../get/index";
import { FromSchema } from "json-schema-to-ts";

export type mailAccountVerifyReqLike = FromSchema<typeof mailAccountGetReq>;
export type mailAccountVerifyResLike = { ok: boolean; message?: string };

const componentArr = [
  {
    type: "schema",
    name: "mailAccountVerifyReq",
    component: mailAccountGetReq,
  },
  {
    type: "schema",
    name: "mailAccountVerifyRes",
    component: mailAccountGetRes,
  },
];

const controller = async (c: NodeHonoContext) => {
  const bodyObj = (await c.req.json()) as mailAccountVerifyReqLike;
  const { valid, errors } = validate(
    bodyObj,
    mailAccountGetReq as object,
    "2020-12",
  );
  if (!valid) throw new HTTPException(422, { cause: errors });
  try {
    await mailAccountService.verify(bodyObj);
    return c.json(
      { ok: true } satisfies mailAccountVerifyResLike,
      httpStatusCode.OK as ContentfulStatusCode,
    );
  } catch (e: any) {
    if (e.message && e.message.includes("未找到")) {
      throw new HTTPException(404, { cause: e.message });
    }
    const { logger } = c.var;
    logger.warn("verify failed");
    return c.json({ ok: false, message: e?.message || "verify failed" }, 401);
  }
};

const pathObj = {
  path: "/verify",
  method: "post",
  description: "验证 mailAccount 配置",
  summary: "验证 mailAccount 配置",
  tags: ["mailAccount"],
  parameters: [],
  requestBody: {
    required: true,
    description: "验证 mailAccount",
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
      description: "验证成功",
      content: {
        "application/json": {
          schema: {
            $ref: `#/components/schemas/${componentArr[1].name}`,
          },
        },
      },
    },
    401: {
      description: "验证失败",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              message: { type: "string" },
            },
            required: ["ok"],
            additionalProperties: false,
          },
        },
      },
    },
  },
} satisfies RawRouteConfig;

export default { pathObj, controller, componentArr };
