import db from "@/db/index";
import { mailAccountTable, type MailAccountPOLike } from "./model";
import { eq, and, or, like, asc, desc, count, inArray } from "drizzle-orm";
import hasValue from "@/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { keyword, isEnabled } = condition || {};
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(or(like(mailAccountTable.mailAddress, `%${keyword}%`)));
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(mailAccountTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPageAll(params: {
  orderBy?: keyof MailAccountPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = mailAccountTable[orderBy] || mailAccountTable.id;
  const maxLimit = 10000;
  const rows = await db
    .select({
      id: mailAccountTable.id,
      mailAddress: mailAccountTable.mailAddress,
      nickname: mailAccountTable.nickname,
      host: mailAccountTable.host,
      port: mailAccountTable.port,
      isEnabled: mailAccountTable.isEnabled,
    })
    .from(mailAccountTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof MailAccountPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailAccountTable[orderBy] || mailAccountTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(mailAccountTable.id).as("total") })
    .from(mailAccountTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as MailAccountPOLike[] };
  }

  const list = await db
    .select()
    .from(mailAccountTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(mailAccountTable)
    .where(eq(mailAccountTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function getMailAccountsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      value: mailAccountTable.id,
      label: mailAccountTable.mailAddress,
    })
    .from(mailAccountTable)
    .where(inArray(mailAccountTable.id, ids));
  return rows;
}

import type { InferInsertModel } from "drizzle-orm";

export async function onInsert(
  data: InferInsertModel<typeof mailAccountTable>
) {
  const result = await db
    .insert(mailAccountTable)
    .values(data)
    .returning({ id: mailAccountTable.id });
  return result[0]?.id;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof mailAccountTable>, "id">>
) {
  const result = await db
    .update(mailAccountTable)
    .set(data)
    .where(eq(mailAccountTable.id, id))
    .returning({ id: mailAccountTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(mailAccountTable)
    .where(eq(mailAccountTable.id, id))
    .returning({ id: mailAccountTable.id });
  return result[0] || null;
}
