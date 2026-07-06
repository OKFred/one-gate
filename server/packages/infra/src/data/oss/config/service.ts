import {
  IndexVO,
  OssConfigVO,
  OssConfigListVO,
  OssConfigAddVO,
  OssConfigUpdateVO,
  OssConfigListKeys,
  OssConfigDetailKeys,
  OssConfigGetKeys,
  OssConfigDeleteKeys,
  OssConfigAddKeys,
  OssConfigUpdateKeys,
  OssConfigSortableKeys,
  type OssConfigPOLike,
  type OssConfigVOLike,
  type OssConfigAddVOLike,
  type OssConfigUpdateVOLike,
  type OssConfigDeleteVOLike,
  type OssConfigGetVOLike,
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
  bodyUserContextAdapter,
} from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { preventStorageInitFailure } from "./prevention";
import { getStorage } from "@hodor/core/utils/storage";
import * as ossConfigRepository from "./repository";

// 列表 (全部)
const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: OssConfigVO["isEnabled"],
    orderBy: orderByWrapper<(keyof OssConfigPOLike)[]>(OssConfigSortableKeys),
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
      name: OssConfigVO["name"],
      provider: OssConfigVO["provider"],
      isEnabled: OssConfigVO["isEnabled"],
      isDefault: OssConfigVO["isDefault"],
    },
    required: ["id", "name", "provider", "isEnabled", "isDefault"],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  const list = await ossConfigRepository.findAll(params);
  return list as any;
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有存储配置",
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
    isEnabled: OssConfigVO["isEnabled"],
    orderBy: orderByWrapper<(keyof OssConfigPOLike)[]>(OssConfigSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<OssConfigPOLike>[]>(
    { ...OssConfigListVO },
    [...OssConfigListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  const { total, list } = await ossConfigRepository.findPage({
    ...params,
    pageNo,
    pageSize: finalPageSize,
  });

  return {
    total,
    totalPage: Math.ceil(total / finalPageSize),
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: list as any,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取存储配置" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增
const addReq = {
  type: "object",
  properties: { ...OssConfigAddVO },
  required: [...OssConfigAddKeys],
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
    await ossConfigRepository.clearAllDefaults();
  }

  const insertedId = await ossConfigRepository.onInsert({
    ...obj,
    creatorId,
  });

  return insertedId;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "添加存储配置" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 更新
const updateReq = {
  type: "object",
  properties: { ...OssConfigUpdateVO },
  required: [...OssConfigUpdateKeys],
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
    await ossConfigRepository.clearAllDefaults(id);
  }

  const updateRow = await ossConfigRepository.onUpdate(id, {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  });

  preventEmpty(updateRow);
  return updateRow.id;
}

const updateApi = {
  req: updateReq,
  res: addRes,
  pathInfo: { path: "/update", method: "post", summary: "更新存储配置" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

// 获取详情
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [...OssConfigGetKeys],
} as const satisfies JSONSchema;

async function onGet(params: FromSchema<typeof getReq>) {
  const row = await ossConfigRepository.findById(params.id);
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...OssConfigVO },
    required: [...OssConfigDetailKeys],
  },
  pathInfo: { path: "/get", method: "post", summary: "获取配置详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  const deletedRow = await ossConfigRepository.onDelete(obj.id);
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

// 验证连通性
async function onVerify(
  obj: FromSchema<typeof getReq>,
  userObj: any,
  c: any
): Promise<boolean> {
  const config = await onGet(obj);
  const storage = getStorage(
    {
      provider: config.provider,
      endpoint: config.endpoint || undefined,
      region: config.region || undefined,
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
      bucket: config.bucket,
      accountId: config.accountId || undefined,
    },
    c.env
  );

  preventStorageInitFailure(storage);

  // 通过列出对象来测试连通性
  await storage.list();
  return true;
}

const verifyApi = {
  req: getReq,
  res: { type: "boolean" },
  pathInfo: { path: "/verify", method: "post", summary: "验证存储连通性" },
  adapter: bodyUserContextAdapter,
  service: onVerify,
  permission: { action: "read" },
} satisfies API;

// Utils: 获取当前默认配置
export async function getDefaultConfig() {
  return await ossConfigRepository.findDefaultActiveConfig();
}

/**
 * 校验名称是否唯一
 */
async function verifyNameUnique(name: string, excludeId?: number) {
  const records = await ossConfigRepository.findByName(name, excludeId);
  return records.length === 0;
}

export const utils = {
  getDefaultConfig,
  verifyNameUnique,
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
