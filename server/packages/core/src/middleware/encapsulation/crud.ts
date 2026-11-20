import type { JSONSchema } from "json-schema-to-ts";
import type { API, AdapterFn } from "./index";
import { bodyAdapter, bodyUserAdapter } from "./adapter";

export interface CompiledBackendSchemaSet {
  readonly listReq: JSONSchema;
  readonly listRes: JSONSchema;
  readonly listAllReq?: JSONSchema;
  readonly listAllRes?: JSONSchema;
  readonly getReq: JSONSchema;
  readonly getRes: JSONSchema;
  readonly addReq?: JSONSchema;
  readonly updateReq?: JSONSchema;
  readonly deleteReq?: JSONSchema;
  readonly deleteWithUndoReq?: JSONSchema;
  readonly deleteWithUndoRes?: JSONSchema;
  readonly idRes: JSONSchema;
}

type CrudServiceFn = (...args: never[]) => Promise<unknown>;

export type CrudOpConfig<THandler extends CrudServiceFn = CrudServiceFn> =
  | THandler
  | {
      readonly handler: THandler;
      readonly adapter?: AdapterFn;
      readonly permission?: { action: string } | false;
      readonly summary?: string;
      readonly path?: string;
      readonly resSchema?: JSONSchema;
    };

export type TypedCrudApi<
  THandler extends CrudServiceFn = CrudServiceFn,
  TReq extends JSONSchema = JSONSchema,
  TRes extends JSONSchema = JSONSchema,
> = {
  readonly req: TReq;
  readonly res: TRes;
  readonly pathInfo: {
    readonly path: string;
    readonly method: "post";
    readonly summary: string;
  };
  readonly adapter: AdapterFn;
  readonly service: THandler;
  readonly permission: { readonly action: string } | false;
};

type CrudOpKey =
  "list" | "listAll" | "get" | "add" | "update" | "delete" | "deleteWithUndo";

export interface CrudApisOptions {
  readonly list?: CrudOpConfig;
  readonly listAll?: CrudOpConfig;
  readonly get?: CrudOpConfig;
  readonly add?: CrudOpConfig;
  readonly update?: CrudOpConfig;
  readonly delete?: CrudOpConfig;
  readonly deleteWithUndo?: CrudOpConfig;
  readonly extra?: Record<string, API>;
}

type ExtractHandler<T> = T extends {
  readonly handler: infer H extends CrudServiceFn;
}
  ? H
  : T extends CrudServiceFn
    ? T
    : CrudServiceFn;

type OpReqSchema<
  TSchemas extends CompiledBackendSchemaSet,
  K extends CrudOpKey,
> = K extends "list"
  ? TSchemas["listReq"]
  : K extends "listAll"
    ? NonNullable<TSchemas["listAllReq"]>
    : K extends "get"
      ? TSchemas["getReq"]
      : K extends "add"
        ? NonNullable<TSchemas["addReq"]>
        : K extends "update"
          ? NonNullable<TSchemas["updateReq"]>
          : K extends "delete"
            ? NonNullable<TSchemas["deleteReq"]>
            : K extends "deleteWithUndo"
              ? NonNullable<TSchemas["deleteWithUndoReq"]>
              : JSONSchema;

type DefaultOpResSchema<
  TSchemas extends CompiledBackendSchemaSet,
  K extends CrudOpKey,
> = K extends "list"
  ? TSchemas["listRes"]
  : K extends "listAll"
    ? NonNullable<TSchemas["listAllRes"]>
    : K extends "get"
      ? TSchemas["getRes"]
      : K extends "deleteWithUndo"
        ? NonNullable<TSchemas["deleteWithUndoRes"]>
        : TSchemas["idRes"];

type ExtractResSchema<
  TSchemas extends CompiledBackendSchemaSet,
  K extends CrudOpKey,
  TOp,
> = TOp extends { readonly resSchema: infer R extends JSONSchema }
  ? R
  : DefaultOpResSchema<TSchemas, K>;

type CrudApisBase<
  TSchemas extends CompiledBackendSchemaSet,
  TOptions extends CrudApisOptions,
> = {
  [
    K in keyof TOptions & CrudOpKey as NonNullable<
      TOptions[K]
    > extends CrudOpConfig
      ? K
      : never
  ]-?: TypedCrudApi<
    ExtractHandler<NonNullable<TOptions[K]>>,
    OpReqSchema<TSchemas, K>,
    ExtractResSchema<TSchemas, K, NonNullable<TOptions[K]>>
  >;
};

export type CreateCrudApisResult<
  TSchemas extends CompiledBackendSchemaSet,
  TOptions extends CrudApisOptions,
> =
  TOptions["extra"] extends Record<string, API>
    ? CrudApisBase<TSchemas, TOptions> & TOptions["extra"]
    : CrudApisBase<TSchemas, TOptions>;

function buildApiEntry(
  op: CrudOpConfig,
  defaults: {
    req: JSONSchema;
    res: JSONSchema;
    path: string;
    summary: string;
    adapter: AdapterFn;
    permission: { action: string } | false;
  }
): API {
  const cfg = typeof op === "function" ? { handler: op } : op;
  return {
    req: defaults.req,
    res: cfg.resSchema ?? defaults.res,
    pathInfo: {
      path: cfg.path ?? defaults.path,
      method: "post",
      summary: cfg.summary ?? defaults.summary,
    },
    adapter: cfg.adapter ?? defaults.adapter,
    service: cfg.handler,
    permission:
      cfg.permission !== undefined ? cfg.permission : defaults.permission,
  };
}

/**
 * 根据顶层共享契约编译出的 JSON Schema 集自动装配标准 CRUD encapsulation API 字典。
 */
export function createCrudApis<
  const TSchemas extends CompiledBackendSchemaSet,
  const TOptions extends CrudApisOptions,
>(
  schemas: TSchemas,
  options: TOptions
): CreateCrudApisResult<TSchemas, TOptions> {
  const apis: Record<string, API> = {};

  if (options.listAll && schemas.listAllReq && schemas.listAllRes) {
    apis.listAll = buildApiEntry(options.listAll, {
      req: schemas.listAllReq,
      res: schemas.listAllRes,
      path: "/listAll",
      summary: "获取全部列表（不分页）",
      adapter: bodyAdapter,
      permission: { action: "read" },
    });
  }

  if (options.list) {
    apis.list = buildApiEntry(options.list, {
      req: schemas.listReq,
      res: schemas.listRes,
      path: "/list",
      summary: "分页获取列表",
      adapter: bodyAdapter,
      permission: { action: "read" },
    });
  }

  if (options.add && schemas.addReq) {
    apis.add = buildApiEntry(options.add, {
      req: schemas.addReq,
      res: schemas.idRes,
      path: "/add",
      summary: "新增记录",
      adapter: bodyUserAdapter,
      permission: { action: "add" },
    });
  }

  if (options.update && schemas.updateReq) {
    apis.update = buildApiEntry(options.update, {
      req: schemas.updateReq,
      res: schemas.idRes,
      path: "/update",
      summary: "更新记录",
      adapter: bodyUserAdapter,
      permission: { action: "edit" },
    });
  }

  if (options.delete && schemas.deleteReq) {
    apis.delete = buildApiEntry(options.delete, {
      req: schemas.deleteReq,
      res: schemas.idRes,
      path: "/delete",
      summary: "删除记录",
      adapter: bodyAdapter,
      permission: { action: "delete" },
    });
  }

  if (
    options.deleteWithUndo &&
    schemas.deleteWithUndoReq &&
    schemas.deleteWithUndoRes
  ) {
    apis.deleteWithUndo = buildApiEntry(options.deleteWithUndo, {
      req: schemas.deleteWithUndoReq,
      res: schemas.deleteWithUndoRes,
      path: "/deleteWithUndo",
      summary: "删除记录并返回短时撤销收据",
      adapter: bodyUserAdapter,
      permission: { action: "delete" },
    });
  }

  if (options.get) {
    apis.get = buildApiEntry(options.get, {
      req: schemas.getReq,
      res: schemas.getRes,
      path: "/get",
      summary: "获取详情",
      adapter: bodyAdapter,
      permission: { action: "read" },
    });
  }

  if (options.extra) {
    for (const [key, api] of Object.entries(options.extra)) {
      apis[key] = api;
    }
  }

  return apis as CreateCrudApisResult<TSchemas, TOptions>;
}

/** 分页参数归一化与分页响应包装辅助函数 */
export function buildPagedListResult<T>(
  list: T[],
  total: number,
  pageNo = 1,
  pageSize = 10
) {
  const safePageSize = pageSize > 1000 ? 1000 : pageSize;
  const totalPage = safePageSize <= 0 ? 0 : Math.ceil(total / safePageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: safePageSize,
    list,
  };
}
