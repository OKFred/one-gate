import type { FromSchema } from "json-schema-to-ts";
import { adminRpaConfigBackendSchemas } from "@hodor/contracts/resources";
import type { UserObj } from "@hodor/core/types/app";
import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { createCrudApis } from "@hodor/core/middleware/encapsulation/crud";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { registry } from "../../common/registry";

const S = adminRpaConfigBackendSchemas;

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

function toRpaConfigListItem(item: SysConfigRow) {
  const cv = (item.configValue || {}) as Record<string, unknown>;
  return {
    id: item.id,
    name: item.configKey,
    cdpUrl: String(cv.cdpUrl ?? ""),
    authToken: typeof cv.authToken === "string" ? cv.authToken : null,
    isDefault: item.isPrimary,
    isEnabled: item.isEnabled,
    creatorId: item.creatorId,
    createTimeUtc: item.createTimeUtc,
    updaterId: item.updaterId ?? null,
    updateTimeUtc: item.updateTimeUtc ?? null,
  };
}

async function onList(params: FromSchema<typeof S.listReq>) {
  const res = await registry.base.sysConfig.list({
    namespace: "rpa",
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    orderBy: mapOrderBy(params.orderBy),
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
  });

  return {
    ...res,
    list: res.list.map(toRpaConfigListItem),
  };
}

async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number | null> {
  const { name, isEnabled, isDefault, remark, ...configValue } = obj;
  return await registry.base.sysConfig.add(
    {
      namespace: "rpa",
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
    ...toRpaConfigListItem(row as unknown as SysConfigRow),
    remark: row.remark ?? null,
  };
}

async function onDelete(obj: FromSchema<typeof S.deleteReq>) {
  return await registry.base.sysConfig.delete({ id: obj.id });
}

async function onVerify(obj: FromSchema<typeof S.getReq>) {
  const row = await registry.base.sysConfig.detail({ id: obj.id });
  preventEmpty(row);
  return { ok: true, message: "验证成功" };
}

const verifyApi = {
  req: S.getReq,
  res: {
    type: "object",
    properties: { ok: { type: "boolean" }, message: { type: "string" } },
    required: ["ok", "message"],
  } as const,
  pathInfo: { path: "/verify", method: "post", summary: "验证浏览器连接" },
  adapter: bodyAdapter,
  service: onVerify,
  permission: { action: "read" },
} satisfies API;

export async function findDefaultActiveConfig() {
  return await registry.base.sysConfig.getMergedConfig("rpa");
}

export default createCrudApis(S, {
  list: { handler: onList, summary: "分页获取RPA配置" },
  add: { handler: onAdd, summary: "添加RPA配置" },
  update: { handler: onUpdate, summary: "更新RPA配置" },
  get: { handler: onGet, summary: "获取RPA配置详情" },
  delete: { handler: onDelete, summary: "删除RPA配置" },
  extra: { verify: verifyApi },
});
