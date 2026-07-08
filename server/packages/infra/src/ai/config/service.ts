import {
  IndexVO,
  AiLlmConfigVO,
  AiLlmConfigListVO,
  AiLlmConfigAddVO,
  AiLlmConfigUpdateVO,
  AiLlmConfigListKeys,
  AiLlmConfigDetailKeys,
  AiLlmConfigGetKeys,
  AiLlmConfigDeleteKeys,
  AiLlmConfigAddKeys,
  AiLlmConfigUpdateKeys,
  AiLlmConfigSortableKeys,
  type AiLlmConfigPOLike,
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
  listAllReqBase,
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
import * as aiLlmConfigRepository from "./repository";

// 列表 (全部)
const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: AiLlmConfigVO["isEnabled"],
    orderBy: orderByWrapper<(keyof AiLlmConfigPOLike)[]>(
      AiLlmConfigSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      ...IndexVO,
      name: AiLlmConfigVO["name"],
      provider: AiLlmConfigVO["provider"],
      isEnabled: AiLlmConfigVO["isEnabled"],
      isDefault: AiLlmConfigVO["isDefault"],
      capabilities: AiLlmConfigVO["capabilities"],
    },
    required: ["id", "name", "provider", "isEnabled", "isDefault"],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await aiLlmConfigRepository.findPageAll(params);
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有 AI 配置",
  },
  adapter: bodyAdapter,
  service: onListAll,
  permission: { action: "read" },
} satisfies API;

// 列表 (分页)
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: AiLlmConfigVO["isEnabled"],
    orderBy: orderByWrapper<(keyof AiLlmConfigPOLike)[]>(
      AiLlmConfigSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<AiLlmConfigPOLike>[]>(
    { ...AiLlmConfigListVO },
    [...AiLlmConfigListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await aiLlmConfigRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取 AI 配置" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增
const addReq = {
  type: "object",
  properties: { ...AiLlmConfigAddVO },
  required: [...AiLlmConfigAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;

  // 如果设置为默认建议，则取消其他默认建议
  if (obj.isDefault) {
    await aiLlmConfigRepository.disableOtherDefaults();
  }

  const addData = {
    ...obj,
    creatorId,
  };
  const insertedId = await aiLlmConfigRepository.onInsert(addData);
  return insertedId || null;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "添加 AI 配置" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 更新
const updateReq = {
  type: "object",
  properties: { ...AiLlmConfigUpdateVO },
  required: [...AiLlmConfigUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<number | null> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;
  await onGet({ id }); // 若记录不存在则由 preventEmpty 抛出

  if (params.isDefault) {
    await aiLlmConfigRepository.disableOtherDefaults(id);
  }

  const updateData = {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  };

  const row = await aiLlmConfigRepository.onUpdate(id, updateData);
  preventEmpty(row);
  return row.id;
}

const updateApi = {
  req: updateReq,
  res: addRes,
  pathInfo: { path: "/update", method: "post", summary: "更新 AI 配置" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

// 获取详情
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [...AiLlmConfigGetKeys],
} as const satisfies JSONSchema;

async function onGet(params: FromSchema<typeof getReq>) {
  const row = await aiLlmConfigRepository.findById(params.id);
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...AiLlmConfigVO },
    required: [...AiLlmConfigDetailKeys],
  },
  pathInfo: { path: "/get", method: "post", summary: "获取配置详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  const row = await aiLlmConfigRepository.onDelete(obj.id);
  preventEmpty(row);
  return row.id;
}

const deleteApi = {
  req: getReq,
  res: addRes,
  pathInfo: { path: "/delete", method: "post", summary: "删除配置" },
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// 验证连通性
async function onVerify(obj: FromSchema<typeof getReq>): Promise<boolean> {
  const config = await onGet(obj);
  try {
    const res = await fetch(`${config.baseUrl}/models`, {
      headers: {
        Authorization: config.apiKey ? `Bearer ${config.apiKey}` : undefined,
      },
    });
    const result = (await res.json()) as {
      object: string;
      data: {
        id: string;
        object: string;
        created: number;
        owned_by: string;
      }[];
    };
    return result.data?.length > 0;
  } catch (e) {
    console.error("验证 AI 配置连通性失败", e);
    return false;
  }
}

const verifyApi = {
  req: getReq,
  res: { type: "boolean" },
  pathInfo: { path: "/verify", method: "post", summary: "验证 AI 连通性" },
  adapter: bodyAdapter,
  service: onVerify,
  permission: { action: "read" },
} satisfies API;

// Utils: 获取当前默认配置
export async function getDefaultConfig() {
  return await aiLlmConfigRepository.getDefaultConfig();
}

export const utils = {
  getDefaultConfig,
};

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  get: getApi,
  delete: deleteApi,
  verify: verifyApi,
};
