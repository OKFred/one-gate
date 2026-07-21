import {
  IndexVO,
  BaseBizConfigVO,
  BaseBizConfigListVO,
  BaseBizConfigAddVO,
  BaseBizConfigUpdateVO,
  BaseBizConfigListKeys,
  BaseBizConfigDetailKeys,
  BaseBizConfigGetKeys,
  BaseBizConfigDeleteKeys,
  BaseBizConfigAddKeys,
  BaseBizConfigUpdateKeys,
  BaseBizConfigSortableKeys,
  NamespacesResVO,
  NamespacesResKeys,
  type BaseBizConfigPOLike,
  type IDomainConfigProvider,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import * as baseBizConfigRepository from "./repository";
import { kv } from "@hodor/core/middleware/cache/index";

import { registry, type IAdminServices } from "@hodor/admin/common/registry";

export function getProvider(namespace: string): IDomainConfigProvider | null {
  try {
    const domainService = registry[namespace as keyof IAdminServices] as Record<
      string,
      unknown
    >;
    if (domainService?.configProvider) {
      return domainService.configProvider as IDomainConfigProvider;
    }
  } catch {}
  return null;
}

export async function getMergedConfig(namespace: string, tenantId: string) {
  const cacheKey = `biz_config:${tenantId}:${namespace}`;
  const cached = await kv.get(cacheKey, "json");
  if (cached) return cached;

  const provider = getProvider(namespace);
  if (!provider) {
    throw new Error(`Provider for namespace ${namespace} not found`);
  }
  const defaultValues = provider.getDefaultValues();
  const dbConfig = await baseBizConfigRepository.findPrimaryByNamespace(
    tenantId,
    namespace
  );

  let finalConfig = defaultValues;
  if (dbConfig) {
    let parsedValue = {};
    try {
      parsedValue =
        typeof dbConfig.configValue === "string"
          ? JSON.parse(dbConfig.configValue)
          : dbConfig.configValue;
    } catch (e) {}
    finalConfig = { ...defaultValues, ...parsedValue };
  }

  await kv.put(cacheKey, finalConfig);
  return finalConfig;
}

// ======================= API: LIST =======================
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    namespace: BaseBizConfigVO["namespace"],
    isEnabled: BaseBizConfigVO["isEnabled"],
    orderBy: orderByWrapper<(keyof BaseBizConfigPOLike)[]>(
      BaseBizConfigSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<BaseBizConfigPOLike>[]>(
    { ...BaseBizConfigListVO },
    [...BaseBizConfigListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(params: FromSchema<typeof listReq>, userObj: UserObj) {
  const tenantId = (userObj as any).tenantId as string;
  if (!tenantId) throw new Error("Missing tenantId");

  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await baseBizConfigRepository.findPage({
    ...params,
    tenantId,
    pageNo,
    pageSize: finalPageSize,
  });

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: list.map((item) => ({
      ...item,
      configValue:
        typeof item.configValue === "string"
          ? JSON.parse(item.configValue)
          : item.configValue,
    })),
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取企业配置" },
  adapter: bodyUserAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// ======================= API: ADD =======================
const addReq = {
  type: "object",
  properties: { ...BaseBizConfigAddVO },
  required: [...BaseBizConfigAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

export async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const tenantId = (userObj as any).tenantId as string;
  if (!tenantId) throw new Error("Missing tenantId");

  preventEmpty(obj.configKey, "配置键不能空");
  preventEmpty(obj.namespace, "命名空间不能空");

  const existId = await baseBizConfigRepository.findIdByCondition(
    tenantId,
    obj.namespace,
    obj.configKey
  );
  if (existId) {
    throw new Error("该命名空间下已存在相同键的配置");
  }

  if (obj.isPrimary) {
    await baseBizConfigRepository.resetPrimaryFlags(tenantId, obj.namespace);
  }

  const insertedId = await baseBizConfigRepository.insert(
    tenantId,
    {
      ...obj,
      configValue:
        typeof obj.configValue === "string"
          ? obj.configValue
          : JSON.stringify(obj.configValue),
    },
    userObj
  );

  await kv.delete(`biz_config:${tenantId}:${obj.namespace}`);

  return insertedId;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "添加企业配置" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// ======================= API: UPDATE =======================
const updateReq = {
  type: "object",
  properties: { ...BaseBizConfigUpdateVO },
  required: [...BaseBizConfigUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const updateRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

export async function onUpdate(
  obj: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<FromSchema<typeof updateRes> | null> {
  const tenantId = (userObj as any).tenantId as string;
  if (!tenantId) throw new Error("Missing tenantId");

  const dbObj = await baseBizConfigRepository.findById(tenantId, obj.id);
  if (!dbObj) {
    throw new Error("记录不存在");
  }

  if (obj.configKey !== undefined && obj.namespace !== undefined) {
    const existId = await baseBizConfigRepository.findIdByCondition(
      tenantId,
      obj.namespace,
      obj.configKey,
      obj.id
    );
    if (existId) {
      throw new Error("该命名空间下已存在相同键的配置");
    }
  }

  if (obj.isPrimary) {
    await baseBizConfigRepository.resetPrimaryFlags(
      tenantId,
      obj.namespace ?? dbObj.namespace,
      obj.id
    );
  }

  await baseBizConfigRepository.updateById(
    tenantId,
    obj.id,
    {
      ...obj,
      configValue: obj.configValue
        ? typeof obj.configValue === "string"
          ? obj.configValue
          : JSON.stringify(obj.configValue)
        : undefined,
    },
    userObj
  );

  const ns = obj.namespace ?? dbObj.namespace;
  await kv.delete(`biz_config:${tenantId}:${ns}`);

  return obj.id;
}

const updateApi = {
  req: updateReq,
  res: updateRes,
  pathInfo: { path: "/update", method: "post", summary: "更新企业配置" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

// ======================= API: DELETE =======================
const deleteReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [...BaseBizConfigDeleteKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  type: "object",
  properties: { count: { type: "integer" } },
  required: ["count"],
} as const satisfies JSONSchema;

export async function onDelete(
  obj: FromSchema<typeof deleteReq>,
  userObj: UserObj
): Promise<FromSchema<typeof deleteRes> | null> {
  const tenantId = (userObj as any).tenantId as string;
  if (!tenantId) throw new Error("Missing tenantId");

  const count = await baseBizConfigRepository.deleteByIds(
    tenantId,
    Array.isArray(obj.id) ? obj.id : [obj.id]
  );

  const namespaces = await baseBizConfigRepository.findNamespaces(tenantId);
  for (const ns of namespaces) {
    await kv.delete(`biz_config:${tenantId}:${ns.namespace}`);
  }

  return { count };
}

const deleteApi = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: { path: "/delete", method: "post", summary: "删除企业配置" },
  adapter: bodyUserAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// ======================= API: GET =======================
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [...BaseBizConfigGetKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: { ...BaseBizConfigVO },
  required: [...BaseBizConfigDetailKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

export async function onGet(
  obj: FromSchema<typeof getReq>,
  userObj: UserObj
): Promise<FromSchema<typeof getRes> | null> {
  const tenantId = (userObj as any).tenantId as string;
  if (!tenantId) throw new Error("Missing tenantId");

  const dbObj = await baseBizConfigRepository.findById(tenantId, obj.id[0]);
  if (!dbObj) return null;

  return {
    ...dbObj,
    configValue:
      typeof dbObj.configValue === "string"
        ? JSON.parse(dbObj.configValue)
        : dbObj.configValue,
  };
}

const getApi = {
  req: getReq,
  res: getRes,
  pathInfo: { path: "/get", method: "post", summary: "获取企业配置详情" },
  adapter: bodyUserAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// ======================= API: SCHEMA =======================
const schemaReq = {
  type: "object",
  properties: {
    namespace: { type: "string" },
  },
  required: ["namespace"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const schemaRes = {
  type: "object",
  additionalProperties: true,
} as const satisfies JSONSchema;

async function onSchema(params: FromSchema<typeof schemaReq>) {
  const provider = getProvider(params.namespace);
  if (!provider) {
    throw new Error(`Provider for namespace ${params.namespace} not found`);
  }
  return provider.getJsonSchema();
}

const schemaApi = {
  req: schemaReq,
  res: schemaRes,
  pathInfo: { path: "/schema", method: "post", summary: "获取配置Schema定义" },
  adapter: bodyAdapter,
  service: onSchema,
  permission: { action: "read" },
} satisfies API;

// ======================= API: NAMESPACES =======================
const namespacesReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

const namespacesRes = {
  ...listResponseWrapper<typeof NamespacesResKeys>({ ...NamespacesResVO }, [
    ...NamespacesResKeys,
  ]),
} as const satisfies JSONSchema;

async function onNamespaces(
  params: FromSchema<typeof namespacesReq>,
  userObj: UserObj
) {
  const tenantId = (userObj as any).tenantId as string;
  if (!tenantId) throw new Error("Missing tenantId");

  const namespaces = await baseBizConfigRepository.findNamespaces(tenantId);
  return {
    total: namespaces.length,
    list: namespaces,
  };
}

const namespacesApi = {
  req: namespacesReq,
  res: namespacesRes,
  pathInfo: {
    path: "/namespaces",
    method: "post",
    summary: "获取已有的命名空间列表",
  },
  adapter: bodyUserAdapter,
  service: onNamespaces,
  permission: { action: "read" },
} satisfies API;

// ======================= EXPORTS =======================
export const apis = {
  list: listApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  get: getApi,
  schema: schemaApi,
  namespaces: namespacesApi,
};
