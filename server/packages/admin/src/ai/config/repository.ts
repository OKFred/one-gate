import db from "@hodor/core/db/index";
import { aiLlmConfigTable, type AiLlmConfigPOLike } from "./model";
import {
  eq,
  and,
  or,
  like,
  asc,
  desc,
  count,
  not,
  type SQL,
} from "drizzle-orm";
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
      or(like(aiLlmConfigTable.name, `%${keyword}%`)) as SQL<unknown>
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(aiLlmConfigTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPageAll(params: {
  orderBy?: keyof AiLlmConfigPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = aiLlmConfigTable[orderBy] || aiLlmConfigTable.id;
  return await db
    .select({
      id: aiLlmConfigTable.id,
      name: aiLlmConfigTable.name,
      provider: aiLlmConfigTable.provider,
      isEnabled: aiLlmConfigTable.isEnabled,
      isDefault: aiLlmConfigTable.isDefault,
      capabilities: aiLlmConfigTable.capabilities,
    })
    .from(aiLlmConfigTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(1000);
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof AiLlmConfigPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = aiLlmConfigTable[orderBy] || aiLlmConfigTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(aiLlmConfigTable.id).as("total") })
    .from(aiLlmConfigTable)
    .where(where);

  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as AiLlmConfigPOLike[] };
  }

  const list = await db
    .select()
    .from(aiLlmConfigTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(aiLlmConfigTable)
    .where(eq(aiLlmConfigTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function getDefaultConfig() {
  const rows = await db
    .select()
    .from(aiLlmConfigTable)
    .where(
      and(
        eq(aiLlmConfigTable.isEnabled, true),
        eq(aiLlmConfigTable.isDefault, true)
      )
    )
    .limit(1);
  return rows[0] || null;
}

export async function disableOtherDefaults(excludeId?: number) {
  if (excludeId !== undefined) {
    await db
      .update(aiLlmConfigTable)
      .set({ isDefault: false })
      .where(
        and(
          eq(aiLlmConfigTable.isDefault, true),
          not(eq(aiLlmConfigTable.id, excludeId))
        )
      );
  } else {
    await db
      .update(aiLlmConfigTable)
      .set({ isDefault: false })
      .where(eq(aiLlmConfigTable.isDefault, true));
  }
}

export async function onInsert(
  data: InferInsertModel<typeof aiLlmConfigTable>
) {
  const result = await db
    .insert(aiLlmConfigTable)
    .values(data)
    .returning({ id: aiLlmConfigTable.id });
  return result[0]?.id;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof aiLlmConfigTable>, "id">>
) {
  const result = await db
    .update(aiLlmConfigTable)
    .set(data)
    .where(eq(aiLlmConfigTable.id, id))
    .returning({ id: aiLlmConfigTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(aiLlmConfigTable)
    .where(eq(aiLlmConfigTable.id, id))
    .returning({ id: aiLlmConfigTable.id });
  return result[0] || null;
}
