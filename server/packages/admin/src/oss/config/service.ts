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
import type { Context } from "@hodor/core/types/app";
import { preventStorageInitFailure } from "./prevention";
import { getStorage } from "@hodor/core/utils/storage";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import { registry } from "../../common/registry";
import {
  IndexVO,
  OssConfigVO,
  OssConfigAddVO,
  OssConfigUpdateVO,
  OssConfigAddKeys,
  OssConfigUpdateKeys,
  OssConfigGetKeys,
  OssConfigDetailKeys,
  OssConfigListKeys,
  OssConfigSortableKeys,
} from "./model";

// 列表 (全部)
const listAllReq = {
  type: "object",
  properties: {
    ...listAllReqBase,
    isEnabled: OssConfigVO["isEnabled"],
    orderBy: orderByWrapper<(typeof OssConfigSortableKeys)[number][]>([
      ...OssConfigSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listAllRes = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: IndexVO.id,
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
  // Use the new generic list
  const res = await registry.base.sysConfig.list({
    namespace: "oss",
    keyword: (params as { keyword?: string }).keyword,
    isEnabled: params.isEnabled,
    // Map order by name to configKey
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
    const configValue = item.configValue as Record<string, unknown> | undefined;
    return {
      id: item.id,
      name: item.configKey,
      provider: configValue?.provider as string | undefined,
      isEnabled: item.isEnabled,
      isDefault: item.isPrimary,
    } as unknown as FromSchema<typeof listAllRes>[number];
  });
}

const listAllApi = {
  req: listAllReq,
  res: listAllRes,
  pathInfo: { path: "/listAll", method: "post", summary: "获取所有存储配置" },
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
    orderBy: orderByWrapper<(typeof OssConfigSortableKeys)[number][]>([
      ...OssConfigSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper(OssConfigVO, [...OssConfigListKeys]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await registry.base.sysConfig.list({
    namespace: "oss",
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
): Promise<number | null> {
  const { name, isEnabled, isDefault, remark, ...configValue } = obj;
  return await registry.base.sysConfig.add(
    {
      namespace: "oss",
      configKey: name,
      isEnabled,
      isPrimary: isDefault,
      configValue,
      remark,
    },
    userObj
  );
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
  const { id, name, isEnabled, isDefault, remark, ...configValue } = params;

  // We need to merge configValue with existing
  const existing = await registry.base.sysConfig.detail({ id });
  const mergedConfigValue = {
    ...existing.configValue,
    ...configValue,
  };

  return await registry.base.sysConfig.update(
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
  required: ["id"],
} as const satisfies JSONSchema;

async function onGet(params: FromSchema<typeof getReq>) {
  const row = await registry.base.sysConfig.detail({ id: params.id as number });
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
    properties: { ...OssConfigVO },
    required: [...OssConfigDetailKeys],
  } as const,
  pathInfo: { path: "/get", method: "post", summary: "获取配置详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  return await registry.base.sysConfig.delete({ id: obj.id as number });
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
  userObj: UserObj,
  c: Context
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
  await storage.list();
  return true;
}

const verifyApi = {
  req: getReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/verify", method: "post", summary: "验证存储连通性" },
  adapter: bodyUserContextAdapter,
  service: onVerify,
  permission: { action: "read" },
} satisfies API;

export async function getDefaultConfig() {
  return await registry.base.sysConfig.getMergedConfig("oss");
}

/** 按配置名精确读取已启用的 OSS 配置，不回退到默认配置。 */
export async function getEnabledConfigByName(name: string) {
  const row = await registry.base.sysConfig.getConfigByKey("oss", name);
  if (!row) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      message: `对象存储配置 ${name} 不存在`,
    });
  }
  if (!row.isEnabled) {
    throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED, {
      message: `对象存储配置 ${name} 已禁用`,
    });
  }
  return row.configValue;
}

export const utils = {
  getDefaultConfig,
  getEnabledConfigByName,
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
