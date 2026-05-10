import type {
  AppBindings,
  Context,
  RawRouteConfig,
  ResJson,
} from "@/types/app";
import { getEnv } from "@/utils/env";
import { validate } from "@cfworker/json-schema";
import {
  BusinessError,
  BusinessErrorCode,
} from "../errorHandler/businessError";
import { errorSchema } from "@/middleware/errorHandler/schema";
import { StatusCodes } from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { JSONSchema } from "json-schema-to-ts";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "@/api/pathRegister";
import { authMiddleware } from "../auth";
import { can } from "../auth/permission";

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

const routeWhitelist = [
  "/system/auth/login",
  "/i18n/translation/listAll",
  "/maintenance/init/db",
];

function routeMaker({
  pathInfo,
  nameSpace,
  adapter,
  service,
  reqSchema,
  resSchema,
  componentArr,
  permission,
}: API & {
  nameSpace: string;
  reqSchema: JSONSchema;
  resSchema: JSONSchema;
  componentArr: ReturnType<typeof componentMaker>[];
}) {
  const controller = async (c: Context) => {
    //获取request header content type
    //如果不是 application/json 则报错
    const contentType = c.req.header("content-type");
    if (contentType !== "application/json") {
      throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
        cause: ["Content-Type must be application/json"],
      });
    }
    const ignoreError = routeWhitelist.some((path) =>
      c.req.path.includes(path)
    );
    try {
      await authMiddleware(c);
      // 基于 action 的权限检查（RBAC）
      if (permission) {
        const userObj = c.get("userObj");
        if (userObj && !(await can(userObj, permission.action, nameSpace))) {
          throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
        }
      } else if (!ignoreError) {
        c.var.logger?.warn(
          `[Security Warning]: Route ${c.req.path} is missing permission declaration!`
        );
      }
    } catch (error) {
      if (!ignoreError) {
        throw error;
      }
    }
    const bodyObj = await c.req.json();
    const { valid, errors } = validate(bodyObj, reqSchema as object, "2020-12");
    if (!valid) {
      throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
        cause: errors,
      });
    }
    c.set("bodyObj", bodyObj);
    const result = await adapter(service)(c);
    if (getEnv("NODE_ENV") !== "production") {
      const { valid: resValid, errors: resErrors } = validate(
        result,
        resSchema as object,
        "2020-12"
      );
      if (!resValid) {
        c.var.logger?.error(
          "Response schema validation failed:\n" + JSON.stringify(resErrors)
        );
      }
    }
    return c.json<ResJson>(
      { ok: true, message: "OK", data: result },
      StatusCodes.OK as ContentfulStatusCode
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
      [StatusCodes.OK as ContentfulStatusCode]: {
        description: "成功",
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/${componentArr[1].name}` },
          },
        },
      },
      [StatusCodes.UNPROCESSABLE_ENTITY]:
        errorSchema[StatusCodes.UNPROCESSABLE_ENTITY],
      [StatusCodes.INTERNAL_SERVER_ERROR]:
        errorSchema[StatusCodes.INTERNAL_SERVER_ERROR],
    },
  } satisfies RawRouteConfig;
  return { pathObj: newPathObj, controller };
}

export interface API {
  req: JSONSchema;
  res: JSONSchema;
  pathInfo: Partial<RawRouteConfig> & Pick<RawRouteConfig, "path" | "method">;
  adapter: Function;
  service: (c: Context | any, ...args: any[]) => Promise<any>;
  /** 声明此 API 需要的 action 权限，由 encapsulation 在调用 service 前自动检查 */
  permission?: { action: string };
}

export default function main(apiObj: Record<string, API>, nameSpace: string) {
  const app = new OpenAPIHono<AppBindings>();
  Array.from(Object.values(apiObj)).forEach((obj) => {
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
