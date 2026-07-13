import { OpenAPIHono } from "@hono/zod-openapi";
import type { TimingVariables } from "hono/timing";

declare global {
  interface Env {}
}
import type { RouteConfig } from "@hono/zod-openapi";
import { ParameterObject, RequestBodyObject } from "openapi3-ts/oas31";
import type { DataScopeValue } from "./dataScope";

export interface PermissionInfo {
  id: number;
  code: string;
  name: string;
  category: "action";
  resource: string | null;
  business: string | null;
  remark: string | null;
  isEnabled: boolean;
  creatorId: number;
  updaterId: number | null;
  createTimeUtc: number;
  updateTimeUtc: number | null;
}

export interface UserObj {
  id: number;
  username: string;
  langCode: string;
  remark?: string | null;
  isEnabled: boolean;
  departmentObj?: { label: string; value: number } | null;
  regionObj?: { value: number; label: string } | null;
  roleArr?: { value: number; label: string }[];
  creatorId?: number;
  updaterId?: number;
  createTimeUtc?: number;
  updateTimeUtc?: number;
  token: string;
  userId: number;
  isSuperAdmin: boolean;
  roleIds: number[];
  permissions: PermissionInfo[];
  dataScope: DataScopeValue;
  customDeptIds: number[];
  _isLoaded?: boolean;
  ensureLoaded: () => Promise<void>;
}
import type { StorageProvider } from "../utils/storage/types";
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
