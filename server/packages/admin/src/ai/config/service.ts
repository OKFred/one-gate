import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
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
import { registry } from "../../common/registry";
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
} from "./model";

// 列表 (全部)
const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: AiLlmConfigVO["isEnabled"],
    orderBy: orderByWrapper<(typeof AiLlmConfigSortableKeys)[number][]>([
      ...AiLlmConfigSortableKeys,
    ]),
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
  const res = await registry.base.sysConfig.list({
    namespace: "ai",
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
      provider: configValue.provider,
      isEnabled: item.isEnabled,
      isDefault: item.isPrimary,
      capabilities: configValue.capabilities,
    } as unknown as FromSchema<typeof listAllRes>[number];
  });
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
    orderBy: orderByWrapper<(typeof AiLlmConfigSortableKeys)[number][]>([
      ...AiLlmConfigSortableKeys,
    ]),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper({ ...AiLlmConfigListVO }, [...AiLlmConfigListKeys]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await registry.base.sysConfig.list({
    namespace: "ai",
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
  const insertedId = await registry.base.sysConfig.add(
    {
      namespace: "ai",
      configKey: obj.name,
      isPrimary: obj.isDefault,
      isEnabled: obj.isEnabled,
      remark: obj.remark,
      configValue: {
        provider: obj.provider,
        baseUrl: obj.baseUrl,
        apiKey: obj.apiKey,
        model: obj.model,
        capabilities: obj.capabilities,
      },
    },
    userObj
  );
  return insertedId;
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
  const { id, ...rest } = params;

  let configValue: Record<string, unknown> | undefined = undefined;
  if (
    rest.provider !== undefined ||
    rest.baseUrl !== undefined ||
    rest.apiKey !== undefined ||
    rest.model !== undefined ||
    rest.capabilities !== undefined
  ) {
    const existing = await onGet({ id });
    configValue = {
      provider: rest.provider ?? existing.provider,
      baseUrl: rest.baseUrl ?? existing.baseUrl,
      apiKey: rest.apiKey ?? existing.apiKey,
      model: rest.model ?? existing.model,
      capabilities: rest.capabilities ?? existing.capabilities,
    };
  }

  const updatedId = await registry.base.sysConfig.update(
    {
      id,
      configKey: rest.name,
      isPrimary: rest.isDefault,
      isEnabled: rest.isEnabled,
      remark: rest.remark,
      configValue,
    },
    userObj
  );
  return updatedId;
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
  const row = await registry.base.sysConfig.detail({ id: params.id as number });
  preventEmpty(row);
  const configValue = (row.configValue || {}) as Record<string, unknown>;
  return {
    ...row,
    ...configValue,
    name: row.configKey,
    isDefault: row.isPrimary,
  } as unknown as FromSchema<typeof getApi.res>;
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
  const deletedId = await registry.base.sysConfig.delete({
    id: obj.id as number,
  });
  return deletedId;
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
    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }
    const result = await registry.base.httpFetch.json<{
      object?: string;
      data?: {
        id: string;
        object: string;
        created: number;
        owned_by: string;
      }[];
    }>(`${config.baseUrl}/models`, {
      headers,
      namespace: "ai.config.verify",
      remark: "AI LLM 配置连通性校验",
    });
    return (result.data?.length ?? 0) > 0;
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
  const res = await registry.base.sysConfig.list({
    namespace: "ai",
    isEnabled: true,
    pageNo: 1,
    pageSize: 1,
  });
  const row = res.list.find((item) => item.isPrimary);
  if (!row) return null;
  const configValue = (row.configValue || {}) as Record<string, unknown>;
  return {
    ...row,
    ...configValue,
    name: row.configKey,
    isDefault: row.isPrimary,
  } as unknown as FromSchema<typeof getApi.res>;
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
