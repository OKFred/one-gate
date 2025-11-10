import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { RouteConfig } from "@hono/zod-openapi";
import { ParameterObject, RequestBodyObject } from "openapi3-ts/oas31";

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
    userObj?: {
      userId: number;
      username: string;
      role: string;
      department: string;
    };
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

export type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
