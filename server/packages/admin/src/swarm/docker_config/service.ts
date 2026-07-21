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
} from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import { dockerClient } from "../docker/client";
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
import { registry } from "../../common/registry";

// 列表 (全部)
const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: SwarmDockerConfigVO["isEnabled"],
    orderBy: orderByWrapper<(typeof SwarmDockerConfigSortableKeys)[number][]>([
      ...SwarmDockerConfigSortableKeys,
    ]),
  },
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
  const res = await registry.base.config.list({
    namespace: "swarm",
    keyword: (params as { keyword?: string }).keyword,
    isEnabled: params.isEnabled,
    orderBy:
      params.orderBy === "name"
        ? "configKey"
        : params.orderBy === "isDefault"
          ? "isPrimary"
          : (params.orderBy as
              | "id"
              | "isPrimary"
              | "configKey"
              | "isEnabled"
              | "createTimeUtc"
              | undefined),
    descend: params.descend,
    pageNo: 1,
    pageSize: 1000,
  });

  return res.list.map((item) => {
    const configValue = (item.configValue || {}) as Record<string, unknown>;
    return {
      id: item.id,
      name: item.configKey,
      host: configValue.host as string,
      isEnabled: item.isEnabled,
      isDefault: item.isPrimary,
    } as unknown as FromSchema<typeof listAllRes>[number];
  });
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
    orderBy: orderByWrapper<(typeof SwarmDockerConfigSortableKeys)[number][]>([
      ...SwarmDockerConfigSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper(SwarmDockerConfigVO, [...SwarmDockerConfigListKeys]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await registry.base.config.list({
    namespace: "swarm",
    keyword: (params as { keyword?: string }).keyword,
    isEnabled: params.isEnabled,
    orderBy:
      params.orderBy === "name"
        ? "configKey"
        : params.orderBy === "isDefault"
          ? "isPrimary"
          : (params.orderBy as
              | "id"
              | "isPrimary"
              | "configKey"
              | "isEnabled"
              | "createTimeUtc"
              | undefined),
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
  });

  return {
    ...res,
    list: res.list.map((item) => {
      const configValue = (item.configValue || {}) as Record<string, unknown>;
      return {
        ...item,
        ...configValue,
        name: item.configKey,
        isDefault: item.isPrimary,
      } as unknown as FromSchema<typeof listRes>["list"][number];
    }),
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
): Promise<number | null> {
  const { name, isEnabled, isDefault, remark, ...configValue } = obj;

  const resultId = await registry.base.config.add(
    {
      namespace: "swarm",
      configKey: name,
      isEnabled,
      isPrimary: isDefault,
      configValue,
      remark,
    },
    userObj
  );

  // 配置变更，重置客户端的初始化状态
  dockerClient.reset();

  return resultId;
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
  const { id, name, isEnabled, isDefault, remark, ...configValue } = params;

  const existing = await registry.base.config.detail({ id });
  const mergedConfigValue = {
    ...existing.configValue,
    ...configValue,
  };

  const res = await registry.base.config.update(
    {
      id,
      configKey: name,
      isEnabled,
      isPrimary: isDefault,
      configValue: mergedConfigValue,
      remark,
    },
    userObj
  );

  // 配置变更，重置客户端的初始化状态
  dockerClient.reset();

  return res;
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
  const row = await registry.base.config.detail({ id: params.id as number });
  return {
    ...row,
    ...row.configValue,
    name: row.configKey,
    isDefault: row.isPrimary,
  };
}

const getApi = {
  req: getReq,
  res: {
    type: "object",
    properties: { ...SwarmDockerConfigVO },
    required: [...SwarmDockerConfigDetailKeys],
  } as const,
  pathInfo: { path: "/get", method: "post", summary: "获取 Docker 配置详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  const res = await registry.base.config.delete({ id: obj.id as number });

  // 配置变更，重置客户端的初始化状态
  dockerClient.reset();

  return res;
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
  return await dockerClient.testRawConnection({
    host: config.host as string,
    apiVersion: (config.apiVersion as string) || "",
    tlsVerify: config.tlsVerify as boolean,
    caCert: (config.caCert as string) ?? undefined,
    clientCert: (config.clientCert as string) ?? undefined,
    clientKey: (config.clientKey as string) ?? undefined,
    cfMtlsBinding: (config.cfMtlsBinding as string) ?? undefined,
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
