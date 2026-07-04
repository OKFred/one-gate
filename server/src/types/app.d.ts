import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { TimingVariables } from "hono/timing";
import type { RouteConfig } from "@hono/zod-openapi";
import { ParameterObject, RequestBodyObject } from "openapi3-ts/oas31";
export type { UserObj } from "@/api/infra/system/user/service";
import type { UserObj } from "@/api/infra/system/user/service";
import type { StorageProvider } from "@/utils/storage/types";
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
    logger: import("pino").Logger;
    getOSS: () => Promise<StorageProvider>;
  };
  Bindings: Env;
};

export type pathObjLike = RouteConfig & {
  controller: (c: Context) => Promise<Response>;
};

// 使用纯泛型实例化，取代交叉类型，让 Hono 内部的上下文推导完美运作
export type Context = import("hono").Context<AppBindings>;
export type App = OpenAPIHono<AppBindings>;

// 定义类型工具：提取 T 中必填的键（检查可选性）
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// 统一的接口返回结构类型
export type ResJson<T = any> = {
  ok: boolean;
  data: T;
  message: string;
};
