import crypto from "crypto";
import { IndexVO } from "./model";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj } from "@hodor/core/types/app";
import { adminSystemApiTokenBackendSchemas } from "@hodor/contracts/resources";
import {
  buildPagedListResult,
  createCrudApis,
} from "@hodor/core/middleware/encapsulation/crud";
import { bodyUserAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmpty } from "@hodor/core/middleware/auth/prevention";
import { apiTokenRepository } from "./repository";

const S = adminSystemApiTokenBackendSchemas;

// ==================== list ====================
/**
 * 分页查询 API 令牌列表
 * @param params 分页与筛选参数
 * @returns 分页列表结果
 */
async function onList(
  params: FromSchema<typeof S.listReq>
): Promise<FromSchema<typeof S.listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const finalPageSize = pageSize > 1000 ? 1000 : pageSize;

  const { total, list } = await apiTokenRepository.findPage({
    keyword: params.keyword,
    status: params.status,
    orderBy,
    descend,
    pageNo,
    pageSize: finalPageSize,
  });

  return buildPagedListResult(
    list.map((row) => ({
      ...row,
      status: row.status as "active" | "revoked",
    })),
    total,
    pageNo,
    finalPageSize
  );
}

// ==================== get ====================
/**
 * 获取单个 API 令牌详情
 * @param obj 包含令牌 ID 的请求对象
 * @returns 令牌详情
 */
async function onGet(
  obj: FromSchema<typeof S.getReq>
): Promise<FromSchema<typeof S.getRes>> {
  const { id } = obj;
  const row = await apiTokenRepository.findById(id);
  preventEmpty(row);
  return {
    ...row,
    status: row.status as "active" | "revoked",
  };
}

// ==================== add ====================
const addRes = {
  type: "object",
  properties: {
    id: IndexVO.id,
    rawToken: {
      type: "string",
      description: "完整令牌值（仅在创建时返回一次）",
    },
  },
  required: ["id", "rawToken"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * 创建新的 API 令牌
 * 生成随机令牌值 → 计算 SHA-256 哈希 → 入库 → 仅在响应中返回完整令牌值
 * @param obj 创建请求参数
 * @param userObj 当前操作用户
 * @returns 令牌 ID 和一次性展示的完整令牌值
 */
async function onAdd(
  obj: FromSchema<typeof S.addReq>,
  userObj: UserObj
): Promise<FromSchema<typeof addRes>> {
  const { userId: creatorId } = userObj;

  // 生成随机令牌：hdr_ + 32字节随机值的 Base64URL 编码
  const rawToken = "hdr_" + crypto.randomBytes(32).toString("base64url");
  // 计算 SHA-256 哈希（入库存储）
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  // 截取前缀用于列表展示
  const tokenPrefix = rawToken.substring(0, 12);

  const insertedId = await apiTokenRepository.onInsert({
    name: obj.name,
    tokenPrefix,
    tokenHash,
    permissions: obj.permissions,
    ipWhitelist: obj.ipWhitelist ?? null,
    startTimeUtc: obj.startTimeUtc ?? null,
    expireTimeUtc: obj.expireTimeUtc ?? null,
    lastUsedTimeUtc: null,
    status: "active",
    remark: obj.remark ?? null,
    creatorId,
  });

  return { id: insertedId, rawToken };
}

// ==================== update ====================
/**
 * 更新 API 令牌（名称、权限、IP白名单、TTL、备注）
 * @param params 更新请求参数
 * @param userObj 当前操作用户
 * @returns 更新的记录 ID
 */
async function onUpdate(
  params: FromSchema<typeof S.updateReq>,
  userObj: UserObj
): Promise<number> {
  const { userId: updaterId } = userObj;
  const { id, ...rest } = params;

  const updatedId = await apiTokenRepository.onUpdate(id, {
    ...rest,
    updaterId,
  });
  return updatedId;
}

// ==================== delete ====================
/**
 * 删除 API 令牌
 * @param obj 包含令牌 ID 的请求对象
 * @returns 删除的记录 ID
 */
async function onDelete(
  obj: FromSchema<typeof S.deleteReq>,
  _userObj: UserObj
): Promise<number> {
  const { id } = obj;
  const deletedId = await apiTokenRepository.onDelete(id);
  return deletedId;
}

// ==================== revoke ====================
const revokeReq = {
  type: "object",
  properties: {
    ...IndexVO,
  },
  required: ["id"] as const,
  additionalProperties: false,
} as const satisfies JSONSchema;
const revokeRes = {
  ...IndexVO["id"],
} as const satisfies JSONSchema;

/**
 * 吊销 API 令牌（将 status 修改为 revoked）
 * @param obj 包含令牌 ID 的请求对象
 * @param userObj 当前操作用户
 * @returns 吊销的记录 ID
 */
async function onRevoke(
  obj: FromSchema<typeof revokeReq>,
  userObj: UserObj
): Promise<FromSchema<typeof revokeRes> | null> {
  const { userId: updaterId } = userObj;
  const { id } = obj;
  const revokedId = await apiTokenRepository.onUpdate(id, {
    status: "revoked",
    updaterId,
  });
  return revokedId;
}
const revokeApi = {
  req: revokeReq,
  res: revokeRes,
  pathInfo: {
    path: "/revoke",
    method: "post",
    summary: "吊销 API 令牌",
  } as const,
  adapter: bodyUserAdapter,
  service: onRevoke,
  permission: { action: "edit" },
} satisfies API;

export default createCrudApis(S, {
  list: { summary: "获取 API 令牌列表", handler: onList },
  get: { summary: "获取 API 令牌详情", handler: onGet },
  add: { resSchema: addRes, summary: "创建 API 令牌", handler: onAdd },
  update: { summary: "更新 API 令牌", handler: onUpdate },
  delete: {
    adapter: bodyUserAdapter,
    summary: "删除 API 令牌",
    handler: onDelete,
  },
  extra: { revoke: revokeApi },
});
