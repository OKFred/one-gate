import db from "@hodor/core/db/index";
import { translationTable, type TranslationPOLike } from "./model";
import {
  eq,
  and,
  or,
  like,
  asc,
  desc,
  count,
  ne,
  inArray,
  type SQL,
} from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  application?: string;
  business?: string;
  langCode?: string;
  isEnabled?: boolean;
}) {
  const { keyword, application, business, langCode, isEnabled } =
    condition || {};
  const conditions: SQL<unknown>[] = [];

  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(translationTable.tKey, `%${keyword}%`),
        like(translationTable.tValue, `%${keyword}%`)
      ) as SQL<unknown>
    );
  }
  if (hasValue(application)) {
    conditions.push(eq(translationTable.application, application as string));
  }
  if (hasValue(business)) {
    conditions.push(eq(translationTable.business, business as string));
  }
  if (hasValue(langCode)) {
    conditions.push(eq(translationTable.langCode, langCode as string));
  }
  if (hasValue(isEnabled)) {
    conditions.push(eq(translationTable.isEnabled, isEnabled as boolean));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPageAll(params: {
  orderBy?: keyof TranslationPOLike;
  descend?: boolean;
  keyword?: string;
  application?: string;
  business?: string;
  langCode?: string;
  isEnabled?: boolean;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = translationTable[orderBy] || translationTable.id;
  const maxLimit = 100_000;
  const rows = await db
    .select({
      id: translationTable.id,
      application: translationTable.application,
      business: translationTable.business,
      langCode: translationTable.langCode,
      tKey: translationTable.tKey,
      tValue: translationTable.tValue,
      isEnabled: translationTable.isEnabled,
    })
    .from(translationTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof TranslationPOLike;
  descend?: boolean;
  keyword?: string;
  application?: string;
  business?: string;
  langCode?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = translationTable[orderBy] || translationTable.id;

  const countResult = await db
    .select({ total: count(translationTable.id).as("total") })
    .from(translationTable)
    .where(buildWhereCondition(params));
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as TranslationPOLike[] };
  }

  const list = await db
    .select()
    .from(translationTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(translationTable)
    .where(eq(translationTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function findTranslationsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ value: translationTable.id, label: translationTable.tKey })
    .from(translationTable)
    .where(inArray(translationTable.id, ids));
  return rows;
}

export async function findDuplicates(params: {
  valueHash: string;
  excludeId?: number;
}) {
  const { valueHash, excludeId } = params;
  const whereCondition = excludeId
    ? and(
        eq(translationTable.valueHash, valueHash),
        ne(translationTable.id, excludeId)
      )
    : eq(translationTable.valueHash, valueHash);

  const rows = await db
    .select({
      id: translationTable.id,
      business: translationTable.business,
      application: translationTable.application,
      langCode: translationTable.langCode,
      tKey: translationTable.tKey,
      tValue: translationTable.tValue,
      isEnabled: translationTable.isEnabled,
    })
    .from(translationTable)
    .where(whereCondition);
  return rows;
}

export async function findByKeyAndLang(params: {
  tKey: string;
  langCode: string;
  excludeId?: number;
}) {
  const { tKey, langCode, excludeId } = params;
  const rows = await db
    .select({ id: translationTable.id })
    .from(translationTable)
    .where(
      and(
        eq(translationTable.tKey, tKey),
        eq(translationTable.langCode, langCode),
        excludeId !== undefined ? ne(translationTable.id, excludeId) : undefined
      )
    )
    .limit(1);
  return rows[0] || null;
}

export async function onInsert(
  data: InferInsertModel<typeof translationTable>
) {
  const result = await db
    .insert(translationTable)
    .values(data)
    .returning({ id: translationTable.id });
  return result[0]?.id ?? null;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof translationTable>, "id">>
) {
  const result = await db
    .update(translationTable)
    .set(data)
    .where(eq(translationTable.id, id))
    .returning({ id: translationTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(translationTable)
    .where(eq(translationTable.id, id))
    .returning({ id: translationTable.id });
  return result[0] || null;
}
