import db from "@/db/index";
import {
  swarmDockerConfigTable,
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
import { asc, count, desc, eq, and, or, like, not } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import { dockerClient } from "../docker/client";
import hasValue from "@/utils/hasValue";
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

// 构建查询条件
const buildWhereCondition = ({
  keyword,
  isEnabled,
}: Pick<FromSchema<typeof listReq>, "keyword" | "isEnabled">) => {
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(or(like(swarmDockerConfigTable.name, `%${keyword}%`)));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(swarmDockerConfigTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

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
  const { orderBy = "id", descend = true } = params;
  const orderField =
    swarmDockerConfigTable[orderBy] || swarmDockerConfigTable.id;
  return await db
    .select({
      id: swarmDockerConfigTable.id,
      name: swarmDockerConfigTable.name,
      host: swarmDockerConfigTable.host,
      isEnabled: swarmDockerConfigTable.isEnabled,
      isDefault: swarmDockerConfigTable.isDefault,
    })
    .from(swarmDockerConfigTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(1000);
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
  const offset = (pageNo - 1) * pageSize;
  const orderField =
    swarmDockerConfigTable[orderBy] || swarmDockerConfigTable.id;

  const countResult = await db
    .select({ total: count(swarmDockerConfigTable.id).as("total") })
    .from(swarmDockerConfigTable)
    .where(buildWhereCondition(params));

  const total = countResult[0]?.total || 0;
  const rows = await db
    .select()
    .from(swarmDockerConfigTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return {
    total,
    totalPage: Math.ceil(total / pageSize),
    currentPage: pageNo,
    pageSize,
    list: rows,
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
    await db
      .update(swarmDockerConfigTable)
      .set({ isDefault: false })
      .where(eq(swarmDockerConfigTable.isDefault, true));
  }

  const result = await db
    .insert(swarmDockerConfigTable)
    .values({ ...obj, creatorId })
    .returning({ id: swarmDockerConfigTable.id });

  // 配置变更，重置客户端的初始化状态
  dockerClient.reset();

  return result[0]?.id;
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
    await db
      .update(swarmDockerConfigTable)
      .set({ isDefault: false })
      .where(
        and(
          eq(swarmDockerConfigTable.isDefault, true),
          not(eq(swarmDockerConfigTable.id, id))
        )
      );
  }

  const res = await db
    .update(swarmDockerConfigTable)
    .set({
      ...rest,
      updaterId,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(swarmDockerConfigTable.id, id))
    .returning({ id: swarmDockerConfigTable.id });

  const row = res[0];
  preventEmpty(row);

  // 配置变更，重置客户端的初始化状态
  dockerClient.reset();

  return row.id;
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
  const rows = await db
    .select()
    .from(swarmDockerConfigTable)
    .where(eq(swarmDockerConfigTable.id, params.id))
    .limit(1);
  const row = rows[0];
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
  const result = await db
    .delete(swarmDockerConfigTable)
    .where(eq(swarmDockerConfigTable.id, obj.id))
    .returning({ id: swarmDockerConfigTable.id });
  const row = result[0];
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
  try {
    // 调用 dockerClient 的测试连接静态方法
    return await dockerClient.testRawConnection({
      host: config.host,
      apiVersion: config.apiVersion,
      tlsVerify: config.tlsVerify,
      caCert: config.caCert ?? undefined,
      clientCert: config.clientCert ?? undefined,
      clientKey: config.clientKey ?? undefined,
      cfMtlsBinding: config.cfMtlsBinding ?? undefined,
    });
  } catch (e) {
    console.error("验证 Docker 连通性失败:", e);
    return false;
  }
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
