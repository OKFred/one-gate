import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { TimingVariables } from "hono/timing";
import type { RouteConfig } from "@hono/zod-openapi";
import { ParameterObject, RequestBodyObject } from "openapi3-ts/oas31";
export type { UserObj } from "@/api/system/user/service";
import type { UserObj } from "@/api/system/user/service";
export type RawRouteConfig = RouteConfig & {
  method: Exclude<RouteConfig["method"], "head" | "trace">;
  request?: {
    body?: RequestBodyObject;
    params?: ParameterObject;
    query?: ParameterObject;
    cookies?: ParameterObject;
    headers?: ParameterObject;
  };
};
export type routeLike = {
  indexFilePath: string;
  namespace: string;
};

export type AppBindings = {
  Variables: {
    bodyObj?: any;
    userObj?: UserObj;
    timing?: TimingVariables;
  };
  Bindings: Env;
};

export type pathObjLike = RouteConfig & {
  // eslint-disable-next-line no-unused-vars
  controller: (c: NodeHonoContext) => Promise<Response>;
};

export type NodeHonoContext = Context<AppBindings> & {
  // req: { pathArr: string[] };
  var: {
    logger: import("pino").Logger;
  };
};
export type App = OpenAPIHono<AppBindings>;

// 定义类型工具：提取 T 中必填的键（检查可选性）
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
