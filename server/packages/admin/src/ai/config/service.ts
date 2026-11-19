import type { FromSchema } from "json-schema-to-ts";
import { adminAiConfigBackendSchemas } from "@hodor/contracts/resources";
import type { UserObj } from "@hodor/core/types/app";
import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { createCrudApis } from "@hodor/core/middleware/encapsulation/crud";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { registry } from "../../common/registry";

const S = adminAiConfigBackendSchemas;

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

function toAiConfigItem(item: SysConfigRow) {
  const cv = (item.configValue || {}) as Record<string, unknown>;
  return {
    id: item.id,
    name: item.configKey,
    provider: String(cv.provider ?? ""),
    model: String(cv.model ?? ""),
    baseUrl: typeof cv.baseUrl === "string" ? cv.baseUrl : null,
    apiKey: String(cv.apiKey ?? ""),
    capabilities: typeof cv.capabilities === "string" ? cv.capabilities : null,
    isDefault: item.isPrimary,
    isEnabled: item.isEnabled,
    remark: item.remark ?? null,
    creatorId: item.creatorId,
    createTimeUtc: item.createTimeUtc,
    updaterId: item.updaterId ?? null,
    updateTimeUtc: item.updateTimeUtc ?? null,
  };
}

async function onListAll(params: FromSchema<typeof S.listAllReq>) {
  const res = await registry.base.sysConfig.list({
    namespace: "ai",
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
      provider: String(cv.provider ?? ""),
      capabilities:
        typeof cv.capabilities === "string" ? cv.capabilities : null,
      isDefault: item.isPrimary,
      isEnabled: item.isEnabled,
    };
  });
}

async function onList(params: FromSchema<typeof S.listReq>) {
  const res = await registry.base.sysConfig.list({
    namespace: "ai",
    keyword: params.keyword,
    isEnabled: params.isEnabled,
    orderBy: mapOrderBy(params.orderBy),
    descend: params.descend,
    pageNo: params.pageNo,
    pageSize: params.pageSize,
  });

  return {
    ...res,
    list: res.list.map(toAiConfigItem),
  };
}

async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<number | null> {
  return await registry.base.sysConfig.add(
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
}

async function onGet(params: FromSchema<typeof S.getReq>) {
  const row = await registry.base.sysConfig.detail({ id: params.id });
  preventEmpty(row);
  return toAiConfigItem(row as unknown as SysConfigRow);
}

async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number | null> {
  const { id, ...rest } = params;

  let configValue: Record<string, unknown> | undefined;
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

  return await registry.base.sysConfig.update(
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
}

async function onDelete(obj: FromSchema<typeof S.deleteReq>) {
  return await registry.base.sysConfig.delete({ id: obj.id });
}

async function onVerify(obj: FromSchema<typeof S.getReq>): Promise<boolean> {
  const config = await onGet(obj);
  try {
    const headers: Record<string, string> = {};
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }
    const result = await registry.base.httpFetch.json<{
      data?: Array<{ id: string }>;
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
  req: S.getReq,
  res: { type: "boolean" } as const,
  pathInfo: { path: "/verify", method: "post", summary: "验证 AI 连通性" },
  adapter: bodyAdapter,
  service: onVerify,
  permission: { action: "read" },
} satisfies API;

export async function getDefaultConfig() {
  const res = await registry.base.sysConfig.list({
    namespace: "ai",
    isEnabled: true,
    orderBy: "isPrimary",
    descend: true,
    pageNo: 1,
    pageSize: 1,
  });
  const row = res.list.find((item) => item.isPrimary);
  if (!row) return null;
  return toAiConfigItem(row);
}

export const utils = {
  getDefaultConfig,
};

export default createCrudApis(S, {
  listAll: { handler: onListAll, summary: "获取所有 AI 配置" },
  list: { handler: onList, summary: "分页获取 AI 配置" },
  add: { handler: onAdd, summary: "添加 AI 配置" },
  update: { handler: onUpdate, summary: "更新 AI 配置" },
  get: { handler: onGet, summary: "获取配置详情" },
  delete: { handler: onDelete, summary: "删除配置" },
  extra: { verify: verifyApi },
});
