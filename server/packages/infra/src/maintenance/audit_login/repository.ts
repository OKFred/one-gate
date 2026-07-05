import db from "@hodor/core/db/index";
import { loginAuditTable, type LoginAuditPOLike } from "./model";
import { eq, desc, asc, count, inArray, and } from "drizzle-orm";

export async function recordLogin(
  userId: number,
  ip: string,
  userAgent: string,
  maxKeep: number = 30
) {
  const now = Date.now();

  // 1. 插入新记录
  await db.insert(loginAuditTable).values({
    userId,
    loginTimeUtc: now,
    ip,
    userAgent,
    creatorId: userId,
  });

  // 2. 检查并清理旧记录（同一个用户最多保留 maxKeep 条）
  const userRecords = await db
    .select({ id: loginAuditTable.id })
    .from(loginAuditTable)
    .where(eq(loginAuditTable.userId, userId))
    .orderBy(desc(loginAuditTable.loginTimeUtc))
    .offset(maxKeep)
    .limit(100); // 批量清理，防止积压

  if (userRecords.length > 0) {
    const idsToDelete = userRecords.map((r) => r.id);
    await db
      .delete(loginAuditTable)
      .where(inArray(loginAuditTable.id, idsToDelete));
  }
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof LoginAuditPOLike;
  descend?: boolean;
  userId?: number;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true, userId } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = loginAuditTable[orderBy] || loginAuditTable.id;

  const conditions = [];
  if (userId !== undefined) {
    conditions.push(eq(loginAuditTable.userId, userId));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ total: count(loginAuditTable.id).as("total") })
    .from(loginAuditTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(loginAuditTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}
