import db from "@hodor/core/db/index";
import { profileTable, type ProfilePOLike } from "./model";
import { eq, and, or, like, asc, desc, count } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  userId?: number;
}) {
  const exprs = [];
  if (condition) {
    if (hasValue(condition.userId)) {
      exprs.push(eq(profileTable.userId, condition.userId));
    }
    if (hasValue(condition.keyword)) {
      exprs.push(
        or(
          like(profileTable.realName, `%${condition.keyword}%`),
          like(profileTable.email, `%${condition.keyword}%`),
          like(profileTable.phone, `%${condition.keyword}%`),
          like(profileTable.remark, `%${condition.keyword}%`)
        )
      );
    }
  }
  return exprs.length > 0 ? and(...exprs) : undefined;
}

export async function listAll(condition?: {
  keyword?: string;
  userId?: number;
}) {
  const where = buildWhereCondition(condition);
  return db.select().from(profileTable).where(where);
}

export async function list(
  pageNo: number,
  pageSize: number,
  orderBy: keyof ProfilePOLike = "createTimeUtc",
  descend = true,
  condition?: { keyword?: string; userId?: number }
) {
  const where = buildWhereCondition(condition);

  const totalRes = await db
    .select({ total: count(profileTable.id) })
    .from(profileTable)
    .where(where);
  const total = totalRes[0]?.total || 0;

  if (total === 0) {
    return { list: [], total };
  }

  const orderField =
    (profileTable as any)[orderBy] || profileTable.createTimeUtc;
  const offset = (pageNo - 1) * pageSize;

  const list = await db
    .select()
    .from(profileTable)
    .where(where)
    .orderBy(descend ? desc(orderField) : asc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { list, total };
}

export async function get(id: number) {
  const res = await db
    .select()
    .from(profileTable)
    .where(eq(profileTable.id, id));
  return res[0] || null;
}

export async function add(
  data: Omit<
    InferInsertModel<typeof profileTable>,
    "createTimeUtc" | "updateTimeUtc"
  >
) {
  const res = await db.insert(profileTable).values(data).returning();
  return res[0] || null;
}

export async function update(
  id: number,
  data: Partial<
    Omit<
      InferInsertModel<typeof profileTable>,
      "createTimeUtc" | "updateTimeUtc"
    >
  >
) {
  const res = await db
    .update(profileTable)
    .set({
      ...data,
      updateTimeUtc: Date.now(),
    })
    .where(eq(profileTable.id, id))
    .returning();
  return res[0] || null;
}

export async function remove(id: number) {
  const res = await db
    .delete(profileTable)
    .where(eq(profileTable.id, id))
    .returning();
  return res[0] || null;
}
