import type {
  AppBindings,
  Context,
  RawRouteConfig,
  ResJson,
} from "../../types/app";
import { getEnv } from "../../utils/env";
import { validate } from "@cfworker/json-schema";
import {
  BusinessError,
  BusinessErrorCode,
} from "../errorHandler/businessError";
import { errorSchema } from "../errorHandler/schema";
import { StatusCodes } from "http-status-codes";
import { ContentfulStatusCode } from "hono/utils/http-status";
import type { JSONSchema } from "json-schema-to-ts";
import { OpenAPIHono } from "@hono/zod-openapi";
import pathRegister from "../../utils/pathRegister.js";
import { registerSchema } from "../../utils/schemaRegistry.js";
import { authMiddleware } from "../auth";
import { can } from "../auth/permission";
import { getTranslator } from "../../utils/i18n/index.js";

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
  "/admin/system/auth/login",
  "/admin/system/auth/oauth/login/url",
  "/admin/system/auth/oauth/login/callback",
  "/admin/i18n/translation/listAll",
  "/admin/mobile/device-app/callback",
  "/admin/mobile/async-task/callback",
  "/admin/mobile/device/report/presence",
  "/admin/mobile/device/report/info",
  "/admin/mobile/device/report/event",
  "/admin/mobile/client-release/upload/prepare",
  "/admin/mobile/client-release/upload/finalize",
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
    const requestPath = c.req.path?.replace(getEnv("BASE_API_PATH") ?? "", "");
    const ignoreError = routeWhitelist.some(
      (path) => requestPath === path || requestPath?.startsWith(`${path}/`)
    );
    try {
      await authMiddleware(c);
      // 基于 action 的权限检查（RBAC）
      if (permission) {
        const userObj = c.get("userObj");
        if (userObj && !(await can(userObj, permission.action, nameSpace))) {
          throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
        }
      } else if (!ignoreError && permission === undefined) {
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
      const t = await getTranslator(c);
      const details = await Promise.all(
        errors.map(async (err) => {
          const rawField = err.instanceLocation?.replace(/^\//, "") || "";
          let fieldName = rawField;
          let i18nKey = "errorHandler.validation.invalid";

          if (err.keyword === "required") {
            const reqMatch = err.error?.match(/property '([^']+)'/);
            if (reqMatch) {
              fieldName = rawField ? `${rawField}.${reqMatch[1]}` : reqMatch[1];
            }
            i18nKey = "errorHandler.validation.required";
          } else if (err.keyword === "type") {
            i18nKey = "errorHandler.validation.type";
          } else if (err.keyword === "minLength") {
            i18nKey = "errorHandler.validation.minLength";
          }

          const errorMsg = await t(i18nKey, { field: fieldName || "value" });
          return {
            type: fieldName || "value",
            message: errorMsg,
          };
        })
      );

      throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
        details,
      });
    }
    c.set("bodyObj", bodyObj);
    const result = await (adapter as AdapterFn)(
      service as Parameters<AdapterFn>[0]
    )(c);
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
      { ok: true, message: "OK", data: result ?? {} },
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

/**
 * 适配器函数类型：接收一个 service 业务处理函数，
 * 返回一个能从 Context 中提取所需参数并调用该函数的闭包。
 */
export type AdapterFn = (
  service: (...args: unknown[]) => Promise<unknown>
) => (c: Context) => Promise<unknown>;

export interface API {
  req: JSONSchema;
  res: JSONSchema;
  pathInfo: Partial<RawRouteConfig> & Pick<RawRouteConfig, "path" | "method">;
  /** 适配器：负责从 Context 中提取参数并注入到 service 函数 */
  adapter: AdapterFn;
  /** 业务逻辑函数：接收适配器提取的参数，返回业务数据 */
  service: (...args: never[]) => Promise<unknown>;
  /** 声明此 API 需要的 action 权限，由 encapsulation 在调用 service 前自动检查 */
  permission?: { action: string } | false;
}

export default function main(apiObj: Record<string, API>, nameSpace: string) {
  const app = new OpenAPIHono<AppBindings>();
  Array.from(Object.values(apiObj)).forEach((obj) => {
    const { req, res, pathInfo } = obj;
    const subNameSpace = pathInfo.path
      .replace(/\//g, ".")
      .slice(1)
      .toLowerCase();
    const componentArr = [
      componentMaker("request", {
        name: `${nameSpace}.${subNameSpace}.req`,
        component: req,
      }),
      componentMaker("response", {
        name: `${nameSpace}.${subNameSpace}.res`,
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
        component.component as unknown as Parameters<
          typeof app.openAPIRegistry.registerComponent
        >[2]
      );
      registerSchema(component.name, component.component as object);
    });
  });
  return app;
}
