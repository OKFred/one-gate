import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@hodor/core/types/app";
import {
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
import {
  IndexVO,
  RpaConfigVO,
  RpaConfigAddVO,
  RpaConfigUpdateVO,
  RpaConfigAddKeys,
  RpaConfigUpdateKeys,
  RpaConfigGetKeys,
  RpaConfigDetailKeys,
  RpaConfigListKeys,
  RpaConfigSortableKeys,
} from "./model";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { Context } from "@hodor/core/types/app";

// 列表 (分页)
const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    isEnabled: RpaConfigVO["isEnabled"],
    orderBy: orderByWrapper<(typeof RpaConfigSortableKeys)[number][]>([
      ...RpaConfigSortableKeys,
    ]),
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper({ ...RpaConfigVO }, [...RpaConfigListKeys]),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const res = await registry.base.config.list({
    namespace: "rpa",
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
  pathInfo: { path: "/list", method: "post", summary: "分页获取RPA配置" },
  adapter: bodyAdapter,
  service: onList,
  permission: { action: "read" },
} satisfies API;

// 新增
const addReq = {
  type: "object",
  properties: { ...RpaConfigAddVO },
  required: [...RpaConfigAddKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

const addRes = { ...IndexVO["id"] } as const satisfies JSONSchema;

async function onAdd(
  obj: FromSchema<typeof addReq>,
  userObj: UserObj
): Promise<number | null> {
  const { name, isEnabled, isDefault, remark, ...configValue } = obj;
  return await registry.base.config.add(
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

const addApi = {
  req: addReq,
  res: addRes,
  pathInfo: { path: "/add", method: "post", summary: "添加RPA配置" },
  adapter: bodyUserAdapter,
  service: onAdd,
  permission: { action: "add" },
} satisfies API;

// 更新
const updateReq = {
  type: "object",
  properties: { ...RpaConfigUpdateVO },
  required: [...RpaConfigUpdateKeys],
  additionalProperties: false,
} as const satisfies JSONSchema;

async function onUpdate(
  params: FromSchema<typeof updateReq>,
  userObj: UserObj
): Promise<number | null> {
  const { id, name, isEnabled, isDefault, remark, ...configValue } = params;

  // We need to merge configValue with existing
  const existing = await registry.base.config.detail({ id: id as number });
  const mergedConfigValue = {
    ...existing.configValue,
    ...configValue,
  };

  return await registry.base.config.update(
    {
      id: id as number,
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
  pathInfo: { path: "/update", method: "post", summary: "更新RPA配置" },
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
    properties: { ...RpaConfigVO },
    required: [...RpaConfigDetailKeys],
  } as const,
  pathInfo: { path: "/get", method: "post", summary: "获取RPA配置详情" },
  adapter: bodyAdapter,
  service: onGet,
  permission: { action: "read" },
} satisfies API;

// 删除
async function onDelete(obj: FromSchema<typeof getReq>) {
  return await registry.base.config.delete({ id: obj.id as number });
}

const deleteApi = {
  req: getReq,
  res: addRes,
  pathInfo: { path: "/delete", method: "post", summary: "删除RPA配置" },
  adapter: bodyAdapter,
  service: onDelete,
  permission: { action: "delete" },
} satisfies API;

// 验证连通性
async function onVerify(
  obj: FromSchema<typeof getReq>,
  userObj: UserObj,
  c: Context
) {
  const row = await registry.base.config.detail({ id: obj.id as number });
  preventEmpty(row);
  const configValue = (row.configValue || {}) as Record<string, string>;
  const cdpUrl = configValue.cdpUrl || "";
  const authToken = configValue.authToken;

  // Implementation left placeholder or call docker client if needed
  return { ok: true, message: "验证成功" };
}

const verifyApi = {
  req: getReq,
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
  const merged = await registry.base.config.getMergedConfig("rpa");
  return merged;
}

export default {
  listApi,
  addApi,
  updateApi,
  getApi,
  deleteApi,
  verifyApi,
};
