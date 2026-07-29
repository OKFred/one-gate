import db from "@hodor/core/db/index";
import { apiDocsTable, type ApiDocsPOLike } from "./model";
import { eq, or, like, and, asc, desc, count, type SQL } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildWhereCondition(condition?: { keyword?: string }) {
  const { keyword } = condition || {};
  const conditions: SQL<unknown>[] = [];

  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(apiDocsTable.name, `%${keyword}%`),
        like(apiDocsTable.description, `%${keyword}%`)
      ) as SQL<unknown>
    );
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
  orderBy?: keyof ApiDocsPOLike;
  descend?: boolean;
  keyword?: string;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = apiDocsTable[orderBy] || apiDocsTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(apiDocsTable.id) })
    .from(apiDocsTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(apiDocsTable)
    .where(where)
    .orderBy(descend ? desc(orderField) : asc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(apiDocsTable)
    .where(eq(apiDocsTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function onInsert(data: InferInsertModel<typeof apiDocsTable>) {
  const result = await db
    .insert(apiDocsTable)
    .values(data)
    .returning({ id: apiDocsTable.id });
  return result[0]?.id || null;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof apiDocsTable>, "id">>
) {
  const { getCurrentTimestampUtcSql } =
    await import("@hodor/core/utils/timestamp");
  const result = await db
    .update(apiDocsTable)
    .set({
      ...data,
      updateTimeUtc: getCurrentTimestampUtcSql(),
    })
    .where(eq(apiDocsTable.id, id))
    .returning({ id: apiDocsTable.id });
  return result[0]?.id || null;
}

export async function onDelete(id: number) {
  const deleted = await db
    .delete(apiDocsTable)
    .where(eq(apiDocsTable.id, id))
    .returning({ id: apiDocsTable.id });
  return deleted[0]?.id || null;
}
