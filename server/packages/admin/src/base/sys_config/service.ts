import {
  IndexVO,
  BaseSysConfigVO,
  BaseSysConfigListVO,
  BaseSysConfigAddVO,
  BaseSysConfigUpdateVO,
  BaseSysConfigListKeys,
  BaseSysConfigDetailKeys,
  BaseSysConfigGetKeys,
  BaseSysConfigDeleteKeys,
  BaseSysConfigAddKeys,
  BaseSysConfigUpdateKeys,
  BaseSysConfigSortableKeys,
  NamespacesResVO,
  NamespacesResKeys,
  type BaseSysConfigPOLike,
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
  queryAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import * as baseSysConfigRepository from "./repository";

import { registry, type IAdminServices } from "../../common/registry";

/**
 * 从注册中心动态查找指定命名空间的 IDomainConfigProvider。
 * 各领域自行将 configProvider 挂到自己的 registry 注册项中，
 * base 层不感知具体领域的存在，完全依赖倒置。
 */
export function getProvider(namespace: string): IDomainConfigProvider | null {
  try {
    const domainService = registry[namespace as keyof IAdminServices] as Record<
      string,
      unknown
    >;
    if (domainService?.configProvider) {
      return domainService.configProvider as IDomainConfigProvider;
    }
  } catch {
    // 领域未注册，返回 null
  }
  return null;
}

export async function getMergedConfig(namespace: string) {
  const provider = getProvider(namespace);
  if (!provider) {
    throw new Error(`Provider for namespace ${namespace} not found`);
  }
  const defaultValues = provider.getDefaultValues();
  const dbConfig =
    await baseSysConfigRepository.findPrimaryByNamespace(namespace);

  if (dbConfig) {
    let parsedValue = {};
    try {
      parsedValue =
        typeof dbConfig.configValue === "string"
          ? JSON.parse(dbConfig.configValue)
          : dbConfig.configValue;
    } catch (e) {
      // ignore JSON parse error
    }
    return { ...defaultValues, ...parsedValue };
  }
  return defaultValues;
}

// ======================= API: LIST =======================
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    namespace: BaseSysConfigVO["namespace"],
    isEnabled: BaseSysConfigVO["isEnabled"],
    orderBy: orderByWrapper<(keyof BaseSysConfigPOLike)[]>(
      BaseSysConfigSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<BaseSysConfigPOLike>[]>(
    { ...BaseSysConfigListVO },
    [...BaseSysConfigListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(params: FromSchema<typeof listReq>) {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await baseSysConfigRepository.findPage({
    ...params,
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
  pathInfo: { path: "/list", method: "post", summary: "分页获取系统配置" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// ======================= API: ADD =======================
const addReq = {
  type: "object",
  properties: { ...BaseSysConfigAddVO },
  required: [...BaseSysConfigAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

export async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;

  if (obj.isPrimary) {
    await baseSysConfigRepository.resetPrimaryFlags(obj.namespace);
  }

  const insertedId = await baseSysConfigRepository.onInsert({
    ...obj,
    configValue:
      typeof obj.configValue === "string"
        ? obj.configValue
        : JSON.stringify(obj.configValue),
    creatorId,
  });

  return insertedId;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "添加配置" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// ======================= API: UPDATE =======================
const updateReq = {
  type: "object",
  properties: { ...BaseSysConfigUpdateVO },
  required: [...BaseSysConfigUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

export async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<number | null> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;

  const existing = await baseSysConfigRepository.findById(id);
  preventEmpty(existing);

  if (params.isPrimary) {
    await baseSysConfigRepository.resetPrimaryFlags(existing.namespace, id);
  }

  const updateData: Partial<import("./model").BaseSysConfigInsertPOLike> = {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  };

  if (rest.configValue !== undefined) {
    updateData.configValue =
      typeof rest.configValue === "string"
        ? rest.configValue
        : JSON.stringify(rest.configValue);
  }

  const updateRow = await baseSysConfigRepository.onUpdate(id, updateData);
  preventEmpty(updateRow);
  return updateRow.id;
}

const updateApi = {
  req: updateReq,
  res: addRes,
  pathInfo: { path: "/update", method: "post", summary: "更新配置" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

// ======================= API: DETAIL =======================
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [...BaseSysConfigGetKeys],
} as const satisfies JSONSchema;

async function onDetail(params: FromSchema<typeof getReq>) {
  const row = await baseSysConfigRepository.findById(params.id as number);
  preventEmpty(row);
  return {
    ...row,
    configValue:
      typeof row.configValue === "string"
        ? JSON.parse(row.configValue)
        : row.configValue,
  };
}

const detailApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...BaseSysConfigVO },
    required: [...BaseSysConfigDetailKeys],
  },
  pathInfo: { path: "/detail", method: "post", summary: "获取配置详情" },
  adapter: bodyAdapter,
  service: onDetail,
  permission: { action: "read" },
} satisfies API;

// ======================= API: DELETE =======================
async function onDelete(obj: FromSchema<typeof getReq>) {
  const deletedRow = await baseSysConfigRepository.onDelete(obj.id as number);
  preventEmpty(deletedRow);
  return deletedRow.id;
}

const deleteApi = {
  req: getReq,
  res: addRes,
  pathInfo: { path: "/delete", method: "post", summary: "删除配置" },
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// ======================= API: SCHEMA =======================
const schemaReq = {
  type: "object",
  properties: { namespace: BaseSysConfigVO["namespace"] },
  required: ["namespace"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onSchema(params: FromSchema<typeof schemaReq>) {
  const provider = getProvider(params.namespace);
  if (!provider) {
    throw new Error(`Provider for namespace ${params.namespace} not found`);
  }
  return {
    schema: provider.getJsonSchema(),
    defaultValues: provider.getDefaultValues(),
  };
}

const schemaApi = {
  req: schemaReq,
  res: {
    type: "object",
    properties: {
      schema: { type: "object", additionalProperties: true },
      defaultValues: { type: "object", additionalProperties: true },
    },
    required: ["schema", "defaultValues"],
  },
  pathInfo: { path: "/schema", method: "post", summary: "获取领域配置Schema" },
  adapter: bodyAdapter,
  service: onSchema,
  permission: { action: "read" },
} satisfies API;

// ======================= API: NAMESPACES =======================
const namespacesApi = {
  req: {
    type: "object",
    additionalProperties: false,
  } as const satisfies JSONSchema,
  res: {
    type: "array",
    items: {
      type: "object",
      properties: { ...NamespacesResVO },
      required: [...NamespacesResKeys],
    },
  } as const satisfies JSONSchema,
  pathInfo: {
    path: "/namespaces",
    method: "post",
    summary: "获取已注册配置的命名空间",
  },
  adapter: bodyAdapter,
  service: async () => {
    const namespaces: { namespace: string }[] = [];
    for (const key of Object.keys(registry)) {
      const domainService = registry[key as keyof typeof registry] as any;
      if (domainService?.configProvider) {
        namespaces.push({ namespace: key });
      }
    }
    return namespaces;
  },
  permission: { action: "read" },
} satisfies API;

export const utils = {
  getProvider,
  getMergedConfig,
  list: onList,
  detail: onDetail,
  add: onAdd,
  update: onUpdate,
  delete: onDelete,
};

export default {
  list: listApi,
  detail: detailApi,
  add: addApi,
  update: updateApi,
  delete: deleteApi,
  schema: schemaApi,
  namespaces: namespacesApi,
};
