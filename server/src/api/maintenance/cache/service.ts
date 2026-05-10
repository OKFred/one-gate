import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { API } from "@/middleware/encapsulation";
import { bodyAdapter } from "@/middleware/encapsulation/adapter";
import { kv } from "@/middleware/cache";
import {
  CacheKeyVO,
  GetValueVO,
  StatsVO,
  RequestParamFields,
  ResponseFields,
} from "./model";

/**
 * 列出所有 keys
 */
const listKeysReq = {
  type: "object",
  properties: {
    prefix: RequestParamFields.prefix,
    limit: RequestParamFields.limit,
  },
  required: [],
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
  const { prefix, limit } = params;
  const result = await kv.list({ prefix, limit });
  return result;
}

const listKeys = {
  req: listKeysReq,
  res: listKeysRes,
  pathInfo: {
    path: "/listKeys",
    method: "post",
    summary: "列出所有键名",
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
    key: RequestParamFields.key,
    type: RequestParamFields.type,
  },
  required: ["key"],
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
  const { key, type = "json" } = params;
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
    key: RequestParamFields.key,
    value: RequestParamFields.value,
    expirationTtl: RequestParamFields.expirationTtl,
  },
  required: ["key", "value"],
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
  const { key, value, expirationTtl } = params;
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
    key: RequestParamFields.key,
  },
  required: ["key"],
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
  const { key } = params;
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
 * 清空所有缓存
 */
const clearReq = {
  type: "object",
  properties: {},
  required: [],
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

async function onClear(): Promise<FromSchema<typeof clearRes>> {
  await kv.clear();
  return { success: true };
}

const clear = {
  req: clearReq,
  res: clearRes,
  pathInfo: {
    path: "/clear",
    method: "post",
    summary: "清空所有缓存键",
  } as const,
  adapter: bodyAdapter,
  service: onClear,
} satisfies API;

export default {
  listKeys,
  get,
  put,
  delete: deleteKey,
  clear,
};
