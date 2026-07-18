import db from "@hodor/core/db/index";
import { apiTaskTable, type ApiTaskPOLike } from "./model";
import { eq, and, or, like, asc, desc, count, type SQL } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { keyword, isEnabled } = condition || {};
  const conditions: SQL<unknown>[] = [];

  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(apiTaskTable.name, `%${keyword}%`),
        like(apiTaskTable.taskKey, `%${keyword}%`)
      ) as SQL<unknown>
    );
  }
  if (hasValue(isEnabled)) {
    conditions.push(eq(apiTaskTable.isEnabled, isEnabled as boolean));
  }

  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof ApiTaskPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = apiTaskTable[orderBy] || apiTaskTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(apiTaskTable.id) })
    .from(apiTaskTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(apiTaskTable)
    .where(where)
    .orderBy(descend ? desc(orderField) : asc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findByKey(taskKey: string) {
  const rows = await db
    .select()
    .from(apiTaskTable)
    .where(eq(apiTaskTable.taskKey, taskKey))
    .limit(1);
  return rows[0] || null;
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(apiTaskTable)
    .where(eq(apiTaskTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function onInsert(data: InferInsertModel<typeof apiTaskTable>) {
  const result = await db
    .insert(apiTaskTable)
    .values(data)
    .returning({ id: apiTaskTable.id });
  return result[0]?.id;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof apiTaskTable>, "id">>
) {
  const result = await db
    .update(apiTaskTable)
    .set(data)
    .where(eq(apiTaskTable.id, id))
    .returning({ id: apiTaskTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(apiTaskTable)
    .where(eq(apiTaskTable.id, id))
    .returning({ id: apiTaskTable.id });
  return result[0] || null;
}

export async function findEnabledByKey(taskKey: string) {
  const rows = await db
    .select()
    .from(apiTaskTable)
    .where(
      and(eq(apiTaskTable.taskKey, taskKey), eq(apiTaskTable.isEnabled, true))
    )
    .limit(1);
  return rows[0] || null;
}
