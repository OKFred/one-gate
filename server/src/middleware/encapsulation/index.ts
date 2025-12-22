import type { AppBindings, NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { JSONSchema } from "json-schema-to-ts";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import { authMiddleware } from "../auth";

function componentMaker(
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

const routeWhitelist = ["/system/auth/login"];

function routeMaker({
  pathInfo,
  nameSpace,
  service,
  reqSchema,
  resSchema,
  componentArr,
}) {
  const controller = async (c: NodeHonoContext) => {
    //获取request header content type
    //如果不是 application/json 则报错
    const contentType = c.req.header("content-type");
    if (contentType !== "application/json") {
      throw new HTTPException(
        httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
        { cause: ["Content-Type must be application/json"] }
      );
    }
    if (!routeWhitelist.some((path) => c.req.path.includes(path))) {
      await authMiddleware(c);
    }
    const bodyObj = await c.req.json();
    const { valid, errors } = validate(bodyObj, reqSchema as object, "2020-12");
    if (!valid) {
      throw new HTTPException(
        httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
        { cause: errors }
      );
    }
    c.set("bodyObj", bodyObj);
    const result = await service(c);
    if (process.env.NODE_ENV !== "production") {
      const { valid: resValid, errors: resErrors } = validate(
        result,
        resSchema as object,
        "2020-12"
      );
      if (!resValid) {
        c.var.logger.error(
          "Response schema validation failed:\n" + JSON.stringify(resErrors)
        );
      }
    }
    return c.json(
      { ok: true, message: "OK", data: result },
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

export interface ServiceItem {
  req: JSONSchema;
  res: JSONSchema;
  pathInfo: Partial<RawRouteConfig>;
  service: (c: NodeHonoContext) => Promise<any>;
}

export default function main(
  service: Record<string, ServiceItem>,
  nameSpace: string,
  prerequisites: Function
) {
  if (prerequisites) {
    prerequisites();
  }
  const app = new OpenAPIHono<AppBindings>();
  Array.from(Object.values(service)).forEach((obj) => {
    const { req, res, pathInfo } = obj;
    const subNameSpace = pathInfo.path
      .replace(/\//g, "_")
      .slice(1)
      .replace(/^\w/, (c) => c.toUpperCase());
    const componentArr = [
      componentMaker("request", {
        name: `${nameSpace}${subNameSpace}Req`,
        component: req,
      }),
      componentMaker("response", {
        name: `${nameSpace}${subNameSpace}Res`,
        component: res,
      }),
    ];
    const { pathObj, controller } = routeMaker({
      ...obj,
      nameSpace,
      reqSchema: req,
      resSchema: res,
      componentArr,
    });
    pathRegister(app, pathObj, controller);
    componentArr.forEach((component) => {
      app.openAPIRegistry.registerComponent(
        "schemas",
        component.name,
        component.component as any
      );
    });
  });
  return app;
}
