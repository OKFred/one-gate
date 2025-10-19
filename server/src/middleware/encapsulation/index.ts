import { AppBindings, NodeHonoContext, RawRouteConfig } from "@/types/app";
import { validate } from "@cfworker/json-schema";
import { HTTPException } from "hono/http-exception";
import { errorSchema } from "@/middleware/errorHandler/schema";
import httpStatusCode from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { JSONSchema } from "json-schema-to-ts";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";

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

function routeMaker({ pathInfo, nameSpace, service, reqSchema, componentArr }) {
  const controller = async (c: NodeHonoContext) => {
    const bodyObj = await c.req.json();
    const { valid, errors } = validate(bodyObj, reqSchema as object, "2020-12");
    if (!valid) {
      throw new HTTPException(
        httpStatusCode.UNPROCESSABLE_ENTITY as ContentfulStatusCode,
        { cause: errors }
      );
    }
    const result = await service(bodyObj);
    return c.json(
      { ok: true, message: "操作成功", data: result },
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
  service: (body: any) => Promise<any>;
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
