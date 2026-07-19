import db from "@hodor/core/db/index";
import { baseConfigTable, type BaseConfigPOLike } from "./model";
import {
  eq,
  and,
  or,
  like,
  desc,
  asc,
  count,
  not,
  ne,
  type SQL,
} from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  namespace?: string;
  isEnabled?: boolean;
}) {
  const { keyword, namespace, isEnabled } = condition || {};
  const conditions: SQL<unknown>[] = [];

  if (hasValue(namespace)) {
    conditions.push(eq(baseConfigTable.namespace, namespace));
  }
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(baseConfigTable.configKey, `%${keyword}%`),
        like(baseConfigTable.remark, `%${keyword}%`)
      ) as SQL<unknown>
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(baseConfigTable.isEnabled, isEnabled));
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
  orderBy?: keyof BaseConfigPOLike;
  descend?: boolean;
  keyword?: string;
  namespace?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = baseConfigTable[orderBy] || baseConfigTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(baseConfigTable.id) })
    .from(baseConfigTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(baseConfigTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(baseConfigTable)
    .where(eq(baseConfigTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function findByNamespaceAndKey(
  namespace: string,
  configKey: string,
  excludeId?: number
) {
  const records = await db
    .select({ id: baseConfigTable.id })
    .from(baseConfigTable)
    .where(
      and(
        eq(baseConfigTable.namespace, namespace),
        eq(baseConfigTable.configKey, configKey),
        excludeId !== undefined ? ne(baseConfigTable.id, excludeId) : undefined
      )
    )
    .limit(1);
  return records;
}

export async function onInsert(data: InferInsertModel<typeof baseConfigTable>) {
  const result = await db
    .insert(baseConfigTable)
    .values(data)
    .returning({ id: baseConfigTable.id });
  return result[0]?.id || null;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof baseConfigTable>, "id">>
) {
  const result = await db
    .update(baseConfigTable)
    .set(data)
    .where(eq(baseConfigTable.id, id))
    .returning({ id: baseConfigTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(baseConfigTable)
    .where(eq(baseConfigTable.id, id))
    .returning({ id: baseConfigTable.id });
  return result[0] || null;
}

export async function clearAllPrimary(namespace: string, excludeId?: number) {
  const updateQuery = db.update(baseConfigTable).set({ isPrimary: false });
  const conditions: SQL<unknown>[] = [eq(baseConfigTable.namespace, namespace)];
  if (excludeId !== undefined) {
    conditions.push(not(eq(baseConfigTable.id, excludeId)));
  }
  await updateQuery.where(and(...conditions));
}

export async function findPrimaryActiveConfig(namespace: string) {
  const rows = await db
    .select()
    .from(baseConfigTable)
    .where(
      and(
        eq(baseConfigTable.namespace, namespace),
        eq(baseConfigTable.isEnabled, true),
        eq(baseConfigTable.isPrimary, true)
      )
    )
    .limit(1);
  return rows[0] || null;
}
