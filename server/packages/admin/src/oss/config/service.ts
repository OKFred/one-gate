import type { FromSchema } from "json-schema-to-ts";
import { adminOssConfigBackendSchemas } from "@hodor/contracts/resources";
import type { Context, UserObj } from "@hodor/core/types/app";
import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserContextAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { createCrudApis } from "@hodor/core/middleware/encapsulation/crud";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import { getStorage } from "@hodor/core/utils/storage";
import { registry } from "../../common/registry";
import { preventStorageInitFailure } from "./prevention";

const S = adminOssConfigBackendSchemas;

type SysConfigRow = Awaited<
  ReturnType<typeof registry.base.sysConfig.list>
>["list"][number];

function mapOrderBy(
  orderBy: FromSchema<typeof S.listReq>["orderBy"]
):
  "id" | "isPrimary" | "configKey" | "isEnabled" | "createTimeUtc" | undefined {
  if (orderBy === "name") return "configKey";
  if (orderBy === "isDefault") return "isPrimary";
  return orderBy;
}

function toOssProvider(val: unknown): "S3" | "R2" {
  return val === "R2" ? "R2" : "S3";
}

function toOssConfigItem(item: SysConfigRow) {
  const cv = (item.configValue || {}) as Record<string, unknown>;
  return {
    id: item.id,
    name: item.configKey,
    provider: toOssProvider(cv.provider),
    bucket: String(cv.bucket ?? ""),
    endpoint: typeof cv.endpoint === "string" ? cv.endpoint : null,
    accountId: typeof cv.accountId === "string" ? cv.accountId : null,
    region: String(cv.region ?? "auto"),
    accessKey: String(cv.accessKey ?? ""),
    secretKey: String(cv.secretKey ?? ""),
    isDefault: item.isPrimary,
    isEnabled: item.isEnabled,
    creatorId: item.creatorId,
    createTimeUtc: item.createTimeUtc,
    updaterId: item.updaterId ?? null,
    updateTimeUtc: item.updateTimeUtc ?? null,
  };
}

async function onListAll(params: FromSchema<typeof S.listAllReq>) {
  const res = await registry.base.sysConfig.list({
    namespace: "oss",
    isEnabled: params.isEnabled,
    orderBy: mapOrderBy(params.orderBy),
    descend: params.descend,
    pageNo: 1,
    pageSize: 1000,
  });

  return res.list.map((item) => {
    const cv = (item.configValue || {}) as Record<string, unknown>;
    return {
      id: item.id,
      name: item.configKey,
      provider: toOssProvider(cv.provider),
      isDefault: item.isPrimary,
      isEnabled: item.isEnabled,
    };
  });
}

async function onList(params: FromSchema<typeof S.listReq>) {
  const res = await registry.base.sysConfig.list({
    namespace: "oss",
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    orderBy: mapOrderBy(params.orderBy),
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
  });

  return {
    ...res,
    list: res.list.map(toOssConfigItem),
  };
}

async function onAdd(
  obj: FromSchema<typeof S.addReq>,
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

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number | null> {
  const { id, name, isEnabled, isDefault, remark, ...configValue } = params;
  const existing = await registry.base.sysConfig.detail({ id });
  const mergedConfigValue = {
    ...(existing.configValue as Record<string, unknown>),
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

async function onGet(params: FromSchema<typeof S.getReq>) {
  const row = await registry.base.sysConfig.detail({ id: params.id });
  return {
    ...toOssConfigItem(row as unknown as SysConfigRow),
    remark: row.remark ?? null,
  };
}

async function onDelete(obj: FromSchema<typeof S.deleteReq>) {
  return await registry.base.sysConfig.delete({ id: obj.id });
}

async function onVerify(
  obj: FromSchema<typeof S.getReq>,
  _userObj: UserObj,
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
  req: S.getReq,
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

export default createCrudApis(S, {
  listAll: { handler: onListAll, summary: "获取所有存储配置" },
  list: { handler: onList, summary: "分页获取存储配置" },
  add: { handler: onAdd, summary: "添加存储配置" },
  update: { handler: onUpdate, summary: "更新存储配置" },
  get: { handler: onGet, summary: "获取配置详情" },
  delete: { handler: onDelete, summary: "删除配置" },
  extra: { verify: verifyApi },
});
