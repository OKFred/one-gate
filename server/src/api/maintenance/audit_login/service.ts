import db from "@/db/index";
import {
  loginAuditTable,
  LoginAuditVO,
  LoginAuditListKeys,
  LoginAuditSortableKeys,
  type LoginAuditPOLike,
} from "./model";
import { eq, desc, asc, count, inArray, and } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import { bodyUserAdapter } from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import type { RequiredKeys } from "@/types/app";
import hasValue from "@/utils/hasValue";

/**
 * 记录用户登录审计
 * @param userId 用户ID
 * @param ip 客户端IP
 * @param userAgent 客户端User-Agent
 */
async function recordLogin(userId: number, ip: string, userAgent: string) {
  const now = Date.now();

  // 1. 插入新记录
  await db.insert(loginAuditTable).values({
    userId,
    loginTimeUtc: now,
    ip,
    userAgent,
    creatorId: userId,
  });

  // 2. 检查并清理旧记录（同一个用户最多保留30条）
  const userRecords = await db
    .select({ id: loginAuditTable.id })
    .from(loginAuditTable)
    .where(eq(loginAuditTable.userId, userId))
    .orderBy(desc(loginAuditTable.loginTimeUtc))
    .offset(30)
    .limit(100); // 批量清理，防止积压

  if (userRecords.length > 0) {
    const idsToDelete = userRecords.map((r) => r.id);
    await db
      .delete(loginAuditTable)
      .where(inArray(loginAuditTable.id, idsToDelete));
  }
}

// --- API ---

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    userId: LoginAuditVO.userId,
    orderBy: orderByWrapper<(keyof LoginAuditPOLike)[]>(LoginAuditSortableKeys),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<LoginAuditPOLike>[]>(
    {
      ...LoginAuditVO,
    },
    [...LoginAuditListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const {
    orderBy = "id",
    descend = true,
    pageNo = 1,
    pageSize = 10,
    userId,
  } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = loginAuditTable[orderBy] || loginAuditTable.id;
  const finalPageSize = Math.min(pageSize, 1000);

  const conditions = [];
  if (hasValue(userId)) {
    conditions.push(eq(loginAuditTable.userId, userId));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // 查询总数
  const countResult = await db
    .select({ total: count(loginAuditTable.id).as("total") })
    .from(loginAuditTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }

  // 查询列表数据
  const rows = await db
    .select()
    .from(loginAuditTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(finalPageSize)
    .offset(offset);

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rows,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取登录审计列表",
  } as const,
  adapter: bodyUserAdapter, // 需要登录才能查看审计记录
  service: onList,
  permission: { action: "read" },
} satisfies API;

export const utils = {
  recordLogin,
};

export default {
  list: listApi,
};
