import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { Context, UserObj } from "../../types/app";
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

type SchemaOutput<T> = T extends JSONSchema ? FromSchema<T> : never;

export type CrudOpConfig<TReq, TRes> =
  | ((params: TReq, userObj: UserObj, c: Context) => Promise<TRes>)
  | {
      readonly handler: (
        params: TReq,
        userObj: UserObj,
        c: Context
      ) => Promise<TRes>;
      readonly adapter?: AdapterFn;
      readonly permission?: { action: string } | false;
      readonly summary?: string;
      readonly path?: string;
      readonly resSchema?: JSONSchema;
    };

export interface CreateCrudApisOptions<
  TSchemas extends CompiledBackendSchemaSet,
> {
  readonly list?: CrudOpConfig<
    SchemaOutput<TSchemas["listReq"]>,
    SchemaOutput<TSchemas["listRes"]>
  >;
  readonly listAll?: TSchemas["listAllReq"] extends JSONSchema
    ? TSchemas["listAllRes"] extends JSONSchema
      ? CrudOpConfig<
          SchemaOutput<TSchemas["listAllReq"]>,
          SchemaOutput<TSchemas["listAllRes"]>
        >
      : never
    : CrudOpConfig<
        Record<string, unknown>,
        ReadonlyArray<Record<string, unknown>>
      >;
  readonly get?: CrudOpConfig<
    SchemaOutput<TSchemas["getReq"]>,
    SchemaOutput<TSchemas["getRes"]> | null
  >;
  readonly add?: TSchemas["addReq"] extends JSONSchema
    ? CrudOpConfig<
        SchemaOutput<TSchemas["addReq"]>,
        SchemaOutput<TSchemas["idRes"]> | null
      >
    : never;
  readonly update?: TSchemas["updateReq"] extends JSONSchema
    ? CrudOpConfig<
        SchemaOutput<TSchemas["updateReq"]>,
        SchemaOutput<TSchemas["idRes"]> | null
      >
    : never;
  readonly delete?: TSchemas["deleteReq"] extends JSONSchema
    ? CrudOpConfig<
        SchemaOutput<TSchemas["deleteReq"]>,
        SchemaOutput<TSchemas["idRes"]> | boolean | null | void
      >
    : never;
  readonly deleteWithUndo?: TSchemas["deleteWithUndoReq"] extends JSONSchema
    ? TSchemas["deleteWithUndoRes"] extends JSONSchema
      ? CrudOpConfig<
          SchemaOutput<TSchemas["deleteWithUndoReq"]>,
          SchemaOutput<TSchemas["deleteWithUndoRes"]>
        >
      : never
    : never;
  readonly extra?: Readonly<Record<string, API>>;
}

function buildApiEntry<TReq, TRes>(
  op: CrudOpConfig<TReq, TRes>,
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
    service: cfg.handler as unknown as (...args: never[]) => Promise<unknown>,
    permission:
      cfg.permission !== undefined ? cfg.permission : defaults.permission,
  };
}

/**
 * 根据顶层共享契约编译出的 JSON Schema 集自动装配标准 CRUD encapsulation API 字典。
 */
export function createCrudApis<TSchemas extends CompiledBackendSchemaSet>(
  schemas: TSchemas,
  options: CreateCrudApisOptions<TSchemas>
): Record<string, API> {
  const apis: Record<string, API> = {};

  if (options.listAll && schemas.listAllReq && schemas.listAllRes) {
    apis.listAll = buildApiEntry(
      options.listAll as CrudOpConfig<unknown, unknown>,
      {
        req: schemas.listAllReq,
        res: schemas.listAllRes,
        path: "/listAll",
        summary: "获取全部列表（不分页）",
        adapter: bodyAdapter,
        permission: { action: "read" },
      }
    );
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
    apis.add = buildApiEntry(options.add as CrudOpConfig<unknown, unknown>, {
      req: schemas.addReq,
      res: schemas.idRes,
      path: "/add",
      summary: "新增记录",
      adapter: bodyUserAdapter,
      permission: { action: "add" },
    });
  }

  if (options.update && schemas.updateReq) {
    apis.update = buildApiEntry(
      options.update as CrudOpConfig<unknown, unknown>,
      {
        req: schemas.updateReq,
        res: schemas.idRes,
        path: "/update",
        summary: "更新记录",
        adapter: bodyUserAdapter,
        permission: { action: "edit" },
      }
    );
  }

  if (options.delete && schemas.deleteReq) {
    apis.delete = buildApiEntry(
      options.delete as CrudOpConfig<unknown, unknown>,
      {
        req: schemas.deleteReq,
        res: schemas.idRes,
        path: "/delete",
        summary: "删除记录",
        adapter: bodyAdapter,
        permission: { action: "delete" },
      }
    );
  }

  if (
    options.deleteWithUndo &&
    schemas.deleteWithUndoReq &&
    schemas.deleteWithUndoRes
  ) {
    apis.deleteWithUndo = buildApiEntry(
      options.deleteWithUndo as CrudOpConfig<unknown, unknown>,
      {
        req: schemas.deleteWithUndoReq,
        res: schemas.deleteWithUndoRes,
        path: "/deleteWithUndo",
        summary: "删除记录并返回短时撤销收据",
        adapter: bodyUserAdapter,
        permission: { action: "delete" },
      }
    );
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

  return apis;
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
