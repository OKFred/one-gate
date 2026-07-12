import db from "@hodor/core/db/index";
import { browserTable, type BrowserPOLike } from "./model";
import { eq, and, or, like, asc, desc, count, not } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildBrowserWhere(condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { keyword, isEnabled } = condition || {};
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(browserTable.name, `%${keyword}%`),
        like(browserTable.cdpUrl, `%${keyword}%`)
      )
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(browserTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findBrowserPageAll(params: {
  orderBy?: keyof BrowserPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = browserTable[orderBy] || browserTable.id;
  return await db
    .select()
    .from(browserTable)
    .where(buildBrowserWhere(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(10000);
}

export async function findBrowserPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof BrowserPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = browserTable[orderBy] || browserTable.id;
  const where = buildBrowserWhere(params);

  const countResult = await db
    .select({ total: count(browserTable.id).as("total") })
    .from(browserTable)
    .where(where);

  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(browserTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findBrowserById(id: number) {
  const rows = await db
    .select()
    .from(browserTable)
    .where(eq(browserTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function findDefaultActiveBrowser(): Promise<BrowserPOLike | null> {
  const rows = await db
    .select()
    .from(browserTable)
    .where(
      and(eq(browserTable.isDefault, true), eq(browserTable.isEnabled, true))
    )
    .limit(1);
  return rows[0] || null;
}

export async function disableOtherBrowserDefaults(exceptId?: number) {
  if (exceptId !== undefined) {
    await db
      .update(browserTable)
      .set({ isDefault: false })
      .where(
        and(
          eq(browserTable.isDefault, true),
          not(eq(browserTable.id, exceptId))
        )
      );
  } else {
    await db
      .update(browserTable)
      .set({ isDefault: false })
      .where(eq(browserTable.isDefault, true));
  }
}

export async function onBrowserInsert(
  data: InferInsertModel<typeof browserTable>
) {
  const result = await db
    .insert(browserTable)
    .values(data)
    .returning({ id: browserTable.id });
  return result[0]?.id;
}

export async function onBrowserUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof browserTable>, "id">>
) {
  const result = await db
    .update(browserTable)
    .set(data)
    .where(eq(browserTable.id, id))
    .returning({ id: browserTable.id });
  return result[0] || null;
}

export async function onBrowserDelete(id: number) {
  const result = await db
    .delete(browserTable)
    .where(eq(browserTable.id, id))
    .returning({ id: browserTable.id });
  return result[0] || null;
}
