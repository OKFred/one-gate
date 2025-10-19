import { NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { JSONSchema } from "json-schema-to-ts";

export function componentMaker(
  dataType: "request" | "response",
  { name, component }: { name: string; component: JSONSchema }
) {
  if (dataType === "request") {
    return {
      type: "schema",
      name,
      component,
    };
  } else {
    return {
      type: "schema",
      name,
      component: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          data: component,
          message: { type: "string" },
        },
        required: ["ok", "data", "message"],
        additionalProperties: false,
      } as const satisfies JSONSchema,
    };
  }
}

export function routeMaker({
  pathInfo,
  nameSpace,
  service,
  reqSchema,
  componentArr,
}) {
  const controller = async (c: NodeHonoContext) => {
    const bodyObj = await c.req.json();
    const { valid, errors } = validate(bodyObj, reqSchema as object, "2020-12");
    if (!valid) {
      throw new HTTPException(
        httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
        { cause: errors }
      );
    }
    const res = await service(bodyObj);
    if (!res) {
      return c.json(
        { ok: false, message: "操作失败", data: null },
        httpStatusCode.OK as ContentfulStatusCode
      );
    }
    return c.json(
      { ok: true, data: res },
      httpStatusCode.OK as ContentfulStatusCode
    );
  };

  const newPathObj = {
    ...pathInfo,
    tags: [nameSpace],
    parameters: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: `#/components/schemas/${componentArr[0].name}` },
        },
      },
    },
    responses: {
      [httpStatusCode.OK as ContentfulStatusCode]: {
        description: "成功",
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/${componentArr[1].name}` },
          },
        },
      },
      [httpStatusCode.UNPROCESSABLE_ENTITY]:
        errorSchema[httpStatusCode.UNPROCESSABLE_ENTITY],
      [httpStatusCode.INTERNAL_SERVER_ERROR]:
        errorSchema[httpStatusCode.INTERNAL_SERVER_ERROR],
    },
  } satisfies RawRouteConfig;
  return { pathObj: newPathObj, controller };
}
