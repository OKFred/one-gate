import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { API } from "@/middleware/encapsulation";
import { bodyAdapter } from "@/middleware/encapsulation/adapter";
import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError/index";
import {
  getKVNamespace,
  createKVNamespace,
  getAllNamespaces,
} from "@/middleware/cache/index";
import {
  NamespaceVO,
  CacheKeyVO,
  GetValueVO,
  StatsVO,
  RequestParamFields,
  ResponseFields,
} from "./schema";

/**
 * 列出所有命名空间
 */
const listNamespacesReq = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listNamespacesRes = {
  type: "object",
  properties: {
    namespaces: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ...NamespaceVO,
        },
        required: ["name", "keyCount"],
        additionalProperties: false,
      },
    },
  },
  required: ["namespaces"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onListNamespaces(): Promise<
  FromSchema<typeof listNamespacesRes>
> {
  const namespaces = await getAllNamespaces();
  return { namespaces };
}

const listNamespaces = {
  req: listNamespacesReq,
  res: listNamespacesRes,
  pathInfo: {
    path: "/listNamespaces",
    method: "post",
    summary: "列出所有缓存命名空间",
  } as const,
  adapter: bodyAdapter,
  service: onListNamespaces,
} satisfies API;

/**
 * 列出指定命名空间的所有 keys
 */
const listKeysReq = {
  type: "object",
  properties: {
    namespace: RequestParamFields.namespace,
    prefix: RequestParamFields.prefix,
    limit: RequestParamFields.limit,
  },
  required: ["namespace"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listKeysRes = {
  type: "object",
  properties: {
    keys: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ...CacheKeyVO,
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
    list_complete: ResponseFields.list_complete,
  },
  required: ["keys", "list_complete"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onListKeys(
  params: FromSchema<typeof listKeysReq>
): Promise<FromSchema<typeof listKeysRes>> {
  const { namespace, prefix, limit } = params;
  const kv = getKVNamespace(namespace);
  if (!kv) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED, {
      namespace,
    });
  }
  const result = await kv.list({ prefix, limit });
  return result;
}

const listKeys = {
  req: listKeysReq,
  res: listKeysRes,
  pathInfo: {
    path: "/listKeys",
    method: "post",
    summary: "列出命名空间中的所有键名",
  } as const,
  adapter: bodyAdapter,
  service: onListKeys,
} satisfies API;

/**
 * 获取指定 key 的值
 */
const getReq = {
  type: "object",
  properties: {
    namespace: RequestParamFields.namespace,
    key: RequestParamFields.key,
    type: RequestParamFields.type,
  },
  required: ["namespace", "key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getRes = {
  type: "object",
  properties: {
    ...GetValueVO,
  },
  required: ["exists"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGet(
  params: FromSchema<typeof getReq>
): Promise<FromSchema<typeof getRes>> {
  const { namespace, key, type = "json" } = params;
  const kv = getKVNamespace(namespace);
  if (!kv) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED, {
      namespace,
    });
  }
  const value = await kv.get(key, { type: type as "text" | "json" });
  return {
    value,
    exists: value !== null,
  };
}

const get = {
  req: getReq,
  res: getRes,
  pathInfo: {
    path: "/get",
    method: "post",
    summary: "获取缓存值",
  } as const,
  adapter: bodyAdapter,
  service: onGet,
} satisfies API;

/**
 * 设置 key-value
 */
const putReq = {
  type: "object",
  properties: {
    namespace: RequestParamFields.namespace,
    key: RequestParamFields.key,
    value: RequestParamFields.value,
    expirationTtl: RequestParamFields.expirationTtl,
  },
  required: ["namespace", "key", "value"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const putRes = {
  type: "object",
  properties: {
    success: ResponseFields.success,
  },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onPut(
  params: FromSchema<typeof putReq>
): Promise<FromSchema<typeof putRes>> {
  const { namespace, key, value, expirationTtl } = params;
  let kv = getKVNamespace(namespace);
  if (!kv) {
    // 自动创建命名空间
    kv = createKVNamespace(namespace);
  }
  // value 来自 JSON Schema 验证，类型安全
  await kv.put(key, value as string | object, { expirationTtl });
  return { success: true };
}

const put = {
  req: putReq,
  res: putRes,
  pathInfo: {
    path: "/put",
    method: "post",
    summary: "设置缓存值",
  } as const,
  adapter: bodyAdapter,
  service: onPut,
} satisfies API;

/**
 * 删除指定 key
 */
const deleteReq = {
  type: "object",
  properties: {
    namespace: RequestParamFields.namespace,
    key: RequestParamFields.key,
  },
  required: ["namespace", "key"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const deleteRes = {
  type: "object",
  properties: {
    success: ResponseFields.success,
  },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onDelete(
  params: FromSchema<typeof deleteReq>
): Promise<FromSchema<typeof deleteRes>> {
  const { namespace, key } = params;
  const kv = getKVNamespace(namespace);
  if (!kv) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED, {
      namespace,
    });
  }
  await kv.delete(key);
  return { success: true };
}

const deleteKey = {
  req: deleteReq,
  res: deleteRes,
  pathInfo: {
    path: "/delete",
    method: "post",
    summary: "删除缓存键",
  } as const,
  adapter: bodyAdapter,
  service: onDelete,
} satisfies API;

/**
 * 清空指定命名空间
 */
const clearReq = {
  type: "object",
  properties: {
    namespace: RequestParamFields.namespace,
  },
  required: ["namespace"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const clearRes = {
  type: "object",
  properties: {
    success: ResponseFields.success,
  },
  required: ["success"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onClear(
  params: FromSchema<typeof clearReq>
): Promise<FromSchema<typeof clearRes>> {
  const { namespace } = params;
  const kv = getKVNamespace(namespace);
  if (!kv) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED, {
      namespace,
    });
  }
  await kv.clear();
  return { success: true };
}

const clear = {
  req: clearReq,
  res: clearRes,
  pathInfo: {
    path: "/clear",
    method: "post",
    summary: "清空命名空间",
  } as const,
  adapter: bodyAdapter,
  service: onClear,
} satisfies API;

/**
 * 获取命名空间统计信息
 */
const getStatsReq = {
  type: "object",
  properties: {
    namespace: RequestParamFields.namespace,
  },
  required: ["namespace"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const getStatsRes = {
  type: "object",
  properties: {
    ...StatsVO,
  },
  required: ["hits", "misses", "keys", "hitRate"],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onGetStats(
  params: FromSchema<typeof getStatsReq>
): Promise<FromSchema<typeof getStatsRes>> {
  const { namespace } = params;
  const kv = getKVNamespace(namespace);
  if (!kv) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED, {
      namespace,
    });
  }
  const stats = await kv.getStats();
  return {
    hits: stats.hits,
    misses: stats.misses,
    keys: stats.keys,
    hitRate: stats.hitRate.toFixed(2) + "%",
  };
}

const getStats = {
  req: getStatsReq,
  res: getStatsRes,
  pathInfo: {
    path: "/getStats",
    method: "post",
    summary: "获取命名空间统计信息",
  } as const,
  adapter: bodyAdapter,
  service: onGetStats,
} satisfies API;

export default {
  listNamespaces,
  listKeys,
  get,
  put,
  delete: deleteKey,
  clear,
  getStats,
};
