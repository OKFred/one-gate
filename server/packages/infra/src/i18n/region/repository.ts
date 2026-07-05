import db from "@hodor/core/db/index";
import { regionTable, type RegionPOLike } from "./model";
import { eq, and, or, like, asc, desc, count, ne } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { keyword, isEnabled } = condition || {};
  const conditions = [];

  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(regionTable.alpha2Code, `%${keyword}%`),
        like(regionTable.alpha3Code, `%${keyword}%`)
      )
    );
  }
  if (hasValue(isEnabled)) {
    conditions.push(eq(regionTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPageAll(params: {
  orderBy?: keyof RegionPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = regionTable[orderBy] || regionTable.id;
  const maxLimit = 100_000;
  const rows = await db
    .select({
      id: regionTable.id,
      labels: regionTable.labels,
      alpha2Code: regionTable.alpha2Code,
      alpha3Code: regionTable.alpha3Code,
      numeric: regionTable.numeric,
      iso3166Independent: regionTable.iso3166Independent,
      isEnabled: regionTable.isEnabled,
      businessLanguages: regionTable.businessLanguages,
    })
    .from(regionTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof RegionPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = regionTable[orderBy] || regionTable.id;

  const countResult = await db
    .select({ total: count(regionTable.id).as("total") })
    .from(regionTable)
    .where(buildWhereCondition(params));
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as RegionPOLike[] };
  }

  const list = await db
    .select()
    .from(regionTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(regionTable)
    .where(eq(regionTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function findByCodes(params: {
  alpha2Code?: string | null;
  alpha3Code?: string | null;
  numeric?: number | null;
  excludeId?: number;
}) {
  const { alpha2Code, alpha3Code, numeric, excludeId } = params;
  const matchConditions = [];

  if (hasValue(alpha2Code)) {
    matchConditions.push(eq(regionTable.alpha2Code, alpha2Code!));
  }
  if (hasValue(alpha3Code)) {
    matchConditions.push(eq(regionTable.alpha3Code, alpha3Code!));
  }
  if (hasValue(numeric)) {
    matchConditions.push(eq(regionTable.numeric, numeric!));
  }
  if (matchConditions.length === 0) return null;

  const matchClause =
    matchConditions.length === 1 ? matchConditions[0] : or(...matchConditions);

  const rows = await db
    .select()
    .from(regionTable)
    .where(
      and(
        matchClause,
        excludeId !== undefined ? ne(regionTable.id, excludeId) : undefined
      )
    )
    .limit(1);
  return rows[0] || null;
}

export async function onInsert(data: InferInsertModel<typeof regionTable>) {
  const result = await db
    .insert(regionTable)
    .values(data)
    .returning({ id: regionTable.id });
  return result[0]?.id ?? null;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof regionTable>, "id">>
) {
  const result = await db
    .update(regionTable)
    .set(data)
    .where(eq(regionTable.id, id))
    .returning({ id: regionTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(regionTable)
    .where(eq(regionTable.id, id))
    .returning({ id: regionTable.id });
  return result[0] || null;
}
