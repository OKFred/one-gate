import db from "@hodor/core/db/index";
import { languageTable, type LanguagePOLike } from "./model";
import { eq, and, or, like, asc, desc, count, ne, SQL } from "drizzle-orm";
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
        like(languageTable.langCode, `%${keyword}%`),
        like(languageTable.nativeName, `%${keyword}%`)
      ) as SQL<unknown>
    );
  }
  if (hasValue(isEnabled)) {
    conditions.push(eq(languageTable.isEnabled, isEnabled as boolean));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPageAll(params: {
  orderBy?: keyof LanguagePOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { orderBy = "sortOrder", descend = false } = params;
  const orderField = languageTable[orderBy] || languageTable.sortOrder;
  const maxLimit = 100_000;
  const rows = await db
    .select({
      id: languageTable.id,
      langCode: languageTable.langCode,
      nativeName: languageTable.nativeName,
      isEnabled: languageTable.isEnabled,
      sortOrder: languageTable.sortOrder,
    })
    .from(languageTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof LanguagePOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "sortOrder", descend = false } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = languageTable[orderBy] || languageTable.sortOrder;

  const countResult = await db
    .select({ total: count(languageTable.id).as("total") })
    .from(languageTable)
    .where(buildWhereCondition(params));
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as LanguagePOLike[] };
  }

  const list = await db
    .select()
    .from(languageTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(languageTable)
    .where(eq(languageTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function findByLangCode(params: {
  langCode: string;
  isEnabled?: boolean;
  excludeId?: number;
}) {
  const { langCode, isEnabled, excludeId } = params;
  const conditions = [eq(languageTable.langCode, langCode)];

  if (isEnabled !== undefined) {
    conditions.push(eq(languageTable.isEnabled, isEnabled));
  }
  if (excludeId !== undefined) {
    conditions.push(ne(languageTable.id, excludeId));
  }

  const rows = await db
    .select()
    .from(languageTable)
    .where(and(...conditions))
    .limit(1);
  return rows[0] || null;
}

export async function onInsert(data: InferInsertModel<typeof languageTable>) {
  const result = await db
    .insert(languageTable)
    .values(data)
    .returning({ id: languageTable.id });
  return result[0]?.id ?? null;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof languageTable>, "id">>
) {
  const result = await db
    .update(languageTable)
    .set(data)
    .where(eq(languageTable.id, id))
    .returning({ id: languageTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(languageTable)
    .where(eq(languageTable.id, id))
    .returning({ id: languageTable.id });
  return result[0] || null;
}
