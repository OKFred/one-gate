import db from "@/db/index";
import { ossConfigTable, type OssConfigPOLike } from "./model";
import { eq, and, or, like, desc, asc, count, not, ne } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { keyword, isEnabled } = condition || {};
  const conditions = [];

  if (hasValue(keyword)) {
    conditions.push(or(like(ossConfigTable.name, `%${keyword}%`)));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(ossConfigTable.isEnabled, isEnabled));
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
  orderBy?: keyof OssConfigPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = ossConfigTable[orderBy] || ossConfigTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(ossConfigTable.id) })
    .from(ossConfigTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(ossConfigTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findAll(params: {
  orderBy?: keyof OssConfigPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = ossConfigTable[orderBy] || ossConfigTable.id;
  const where = buildWhereCondition(params);

  return await db
    .select({
      id: ossConfigTable.id,
      name: ossConfigTable.name,
      provider: ossConfigTable.provider,
      isEnabled: ossConfigTable.isEnabled,
      isDefault: ossConfigTable.isDefault,
    })
    .from(ossConfigTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(1000);
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(ossConfigTable)
    .where(eq(ossConfigTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function onInsert(data: InferInsertModel<typeof ossConfigTable>) {
  const result = await db
    .insert(ossConfigTable)
    .values(data)
    .returning({ id: ossConfigTable.id });
  return result[0]?.id || null;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof ossConfigTable>, "id">>
) {
  const result = await db
    .update(ossConfigTable)
    .set(data)
    .where(eq(ossConfigTable.id, id))
    .returning({ id: ossConfigTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(ossConfigTable)
    .where(eq(ossConfigTable.id, id))
    .returning({ id: ossConfigTable.id });
  return result[0] || null;
}

export async function clearAllDefaults(excludeId?: number) {
  const updateQuery = db.update(ossConfigTable).set({ isDefault: false });
  if (excludeId !== undefined) {
    await updateQuery.where(not(eq(ossConfigTable.id, excludeId)));
  } else {
    await updateQuery;
  }
}

export async function findDefaultActiveConfig() {
  const rows = await db
    .select()
    .from(ossConfigTable)
    .where(
      and(
        eq(ossConfigTable.isEnabled, true),
        eq(ossConfigTable.isDefault, true)
      )
    )
    .limit(1);
  return rows[0] || null;
}

export async function findByName(name: string, excludeId?: number) {
  const records = await db
    .select({ id: ossConfigTable.id })
    .from(ossConfigTable)
    .where(
      and(
        eq(ossConfigTable.name, name),
        excludeId !== undefined ? ne(ossConfigTable.id, excludeId) : undefined
      )
    )
    .limit(1);
  return records;
}
