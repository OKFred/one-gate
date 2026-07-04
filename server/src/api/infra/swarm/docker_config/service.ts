import {
  IndexVO,
  SwarmDockerConfigVO,
  SwarmDockerConfigListVO,
  SwarmDockerConfigAddVO,
  SwarmDockerConfigUpdateVO,
  SwarmDockerConfigListKeys,
  SwarmDockerConfigDetailKeys,
  SwarmDockerConfigGetKeys,
  SwarmDockerConfigDeleteKeys,
  SwarmDockerConfigAddKeys,
  SwarmDockerConfigUpdateKeys,
  SwarmDockerConfigSortableKeys,
  type SwarmDockerConfigPOLike,
} from "./model";
import * as swarmDockerConfigRepository from "./repository";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { dockerClient } from "../docker/client";
import {
  listAllReqBase,
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import { preventEmpty } from "@/middleware/auth/prevention";

// 列表 (全部)
const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: SwarmDockerConfigVO["isEnabled"],
    orderBy: orderByWrapper<(keyof SwarmDockerConfigPOLike)[]>(
      SwarmDockerConfigSortableKeys
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
      name: SwarmDockerConfigVO["name"],
      host: SwarmDockerConfigVO["host"],
      isEnabled: SwarmDockerConfigVO["isEnabled"],
      isDefault: SwarmDockerConfigVO["isDefault"],
    },
    required: ["id", "name", "host", "isEnabled", "isDefault"],
    additionalProperties: false,
  },
} as const satisfies JSONSchema;

async function onListAll(
  params: FromSchema<typeof listAllReq>
): Promise<FromSchema<typeof listAllRes>> {
  return await swarmDockerConfigRepository.findAll(params);
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: {
    path: "/listAll",
    method: "post",
    summary: "获取所有 Docker 配置",
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
    isEnabled: SwarmDockerConfigVO["isEnabled"],
    orderBy: orderByWrapper<(keyof SwarmDockerConfigPOLike)[]>(
      SwarmDockerConfigSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<SwarmDockerConfigPOLike>[]>(
    { ...SwarmDockerConfigListVO },
    [...SwarmDockerConfigListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;

  const { list, total } = await swarmDockerConfigRepository.findPage({
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    pageNo,
    pageSize,
    orderBy: orderBy as keyof SwarmDockerConfigPOLike,
    descend,
  });

  return {
    total,
    totalPage: Math.ceil(total / pageSize),
    currentPage: pageNo,
    pageSize,
    list,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: { path: "/list", method: "post", summary: "分页获取 Docker 配置" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增
const addReq = {
  type: "object",
  properties: { ...SwarmDockerConfigAddVO },
  required: [...SwarmDockerConfigAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes> | null> {
  const { userId: creatorId } = userObj;

  // 如果设置为默认配置，则取消其他默认配置
  if (obj.isDefault) {
    await swarmDockerConfigRepository.clearAllDefaults();
  }

  const result = await swarmDockerConfigRepository.onInsert({
    ...obj,
    creatorId,
  });

  // 配置变更，重置客户端的初始化状态
  dockerClient.reset();

  return result?.id ?? null;
}

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "添加 Docker 配置" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 更新
const updateReq = {
  type: "object",
  properties: { ...SwarmDockerConfigUpdateVO },
  required: [...SwarmDockerConfigUpdateKeys],
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
    await swarmDockerConfigRepository.clearAllDefaults(id);
  }

  const res = await swarmDockerConfigRepository.onUpdate(id, {
    ...rest,
    updaterId,
    updateTimeUtc: Date.now(),
  });

  preventEmpty(res);

  // 配置变更，重置客户端的初始化状态
  dockerClient.reset();

  return res.id;
}

const updateApi = {
  req: updateReq,
  res: addRes,
  pathInfo: { path: "/update", method: "post", summary: "更新 Docker 配置" },
  adapter: bodyUserAdapter,
  service: onUpdate,
  permission: { action: "edit" },
} satisfies API;

// 获取详情
const getReq = {
  type: "object",
  properties: { ...IndexVO },
  required: [...SwarmDockerConfigGetKeys],
} as const satisfies JSONSchema;

async function onGet(params: FromSchema<typeof getReq>) {
  const row = await swarmDockerConfigRepository.findById(params.id);
  preventEmpty(row);
  return row;
}

const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...SwarmDockerConfigVO },
    required: [...SwarmDockerConfigDetailKeys],
  },
  pathInfo: { path: "/get", method: "post", summary: "获取 Docker 配置详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  const row = await swarmDockerConfigRepository.onDelete(obj.id);
  preventEmpty(row);

  // 配置变更，重置客户端的初始化状态
  dockerClient.reset();

  return row.id;
}

const deleteApi = {
  req: getReq,
  res: addRes,
  pathInfo: { path: "/delete", method: "post", summary: "删除 Docker 配置" },
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// 验证连通性
async function onVerify(obj: FromSchema<typeof getReq>): Promise<boolean> {
  const config = await onGet(obj);
  // testRawConnection 在连接失败时会抛出 BusinessError，由 errorHandler 统一处理
  return await dockerClient.testRawConnection({
    host: config.host,
    apiVersion: config.apiVersion || "",
    tlsVerify: config.tlsVerify,
    caCert: config.caCert ?? undefined,
    clientCert: config.clientCert ?? undefined,
    clientKey: config.clientKey ?? undefined,
    cfMtlsBinding: config.cfMtlsBinding ?? undefined,
  });
}

const verifyApi = {
  req: getReq,
  res: { type: "boolean" },
  pathInfo: { path: "/verify", method: "post", summary: "验证 Docker 连通性" },
  adapter: bodyAdapter,
  service: onVerify,
  permission: { action: "read" },
} satisfies API;

export default {
  listAll: listAllApi,
  list: listApi,
  add: addApi,
  update: updateApi,
  get: getApi,
  delete: deleteApi,
  verify: verifyApi,
};
