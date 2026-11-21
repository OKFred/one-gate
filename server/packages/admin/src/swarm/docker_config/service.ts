import type { FromSchema } from "json-schema-to-ts";
import { adminSwarmDockerConfigBackendSchemas } from "@hodor/contracts/resources";
import type { UserObj } from "@hodor/core/types/app";
import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { createCrudApis } from "@hodor/core/middleware/encapsulation/crud";
import { registry } from "../../common/registry";
import { dockerClient } from "../docker/client";

const S = adminSwarmDockerConfigBackendSchemas;

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

function toDockerConfigItem(item: SysConfigRow) {
  const cv = (item.configValue || {}) as Record<string, unknown>;
  return {
    id: item.id,
    name: item.configKey,
    apiVersion: String(cv.apiVersion ?? ""),
    host: String(cv.host ?? ""),
    tlsVerify: Boolean(cv.tlsVerify),
    cfMtlsBinding:
      typeof cv.cfMtlsBinding === "string" ? cv.cfMtlsBinding : null,
    caCert: typeof cv.caCert === "string" ? cv.caCert : null,
    clientCert: typeof cv.clientCert === "string" ? cv.clientCert : null,
    clientKey: typeof cv.clientKey === "string" ? cv.clientKey : null,
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
    namespace: "swarm",
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
      host: String(cv.host ?? ""),
      isDefault: item.isPrimary,
      isEnabled: item.isEnabled,
    };
  });
}

async function onList(params: FromSchema<typeof S.listReq>) {
  const res = await registry.base.sysConfig.list({
    namespace: "swarm",
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    orderBy: mapOrderBy(params.orderBy),
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
  });

  return {
    ...res,
    list: res.list.map(toDockerConfigItem),
  };
}

async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number | null> {
  const { name, isEnabled, isDefault, remark, ...configValue } = obj;
  const resultId = await registry.base.sysConfig.add(
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

  dockerClient.reset();
  return resultId;
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

  const res = await registry.base.sysConfig.update(
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

  dockerClient.reset();
  return res;
}

async function onGet(params: FromSchema<typeof S.getReq>) {
  const row = await registry.base.sysConfig.detail({ id: params.id });
  return {
    ...toDockerConfigItem(row as unknown as SysConfigRow),
    remark: row.remark ?? null,
  };
}

async function onDelete(obj: FromSchema<typeof S.deleteReq>) {
  const res = await registry.base.sysConfig.delete({ id: obj.id });
  dockerClient.reset();
  return res;
}

async function onVerify(obj: FromSchema<typeof S.getReq>): Promise<boolean> {
  const config = await onGet(obj);
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
  req: S.getReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/verify", method: "post", summary: "验证 Docker 连通性" },
  adapter: bodyAdapter,
  service: onVerify,
  permission: { action: "read" },
} satisfies API;

export default createCrudApis(S, {
  listAll: { handler: onListAll, summary: "获取所有 Docker 配置" },
  list: { handler: onList, summary: "分页获取 Docker 配置" },
  add: { handler: onAdd, summary: "添加 Docker 配置" },
  update: { handler: onUpdate, summary: "更新 Docker 配置" },
  get: { handler: onGet, summary: "获取 Docker 配置详情" },
  delete: { handler: onDelete, summary: "删除 Docker 配置" },
  extra: { verify: verifyApi },
});
