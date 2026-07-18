import db from "@hodor/core/db/index";
import { mailLogTable, type MailLogPOLike } from "./model";
import {
  eq,
  and,
  or,
  like,
  asc,
  desc,
  count,
  gte,
  lte,
  type SQL,
} from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  sendStatus?: boolean;
  templateId?: string;
  startTimeUtc?: number;
  endTimeUtc?: number;
}) {
  const { keyword, sendStatus, templateId, startTimeUtc, endTimeUtc } =
    condition || {};
  const conditions: SQL<unknown>[] = [];
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(mailLogTable.mailTo, `%${keyword}%`),
        like(mailLogTable.mailFrom, `%${keyword}%`)
      ) as SQL<unknown>
    );
  }
  if (sendStatus !== undefined) {
    conditions.push(eq(mailLogTable.sendStatus, sendStatus));
  }
  if (hasValue(templateId)) {
    conditions.push(eq(mailLogTable.templateId, templateId as string));
  }
  if (startTimeUtc !== undefined) {
    conditions.push(gte(mailLogTable.createTimeUtc, startTimeUtc));
  }
  if (endTimeUtc !== undefined) {
    conditions.push(lte(mailLogTable.createTimeUtc, endTimeUtc));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPageAll(params: {
  orderBy?: keyof MailLogPOLike;
  descend?: boolean;
  keyword?: string;
  sendStatus?: boolean;
  templateId?: string;
  startTimeUtc?: number;
  endTimeUtc?: number;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = mailLogTable[orderBy] || mailLogTable.id;
  const maxLimit = 10000;
  const rows = await db
    .select({
      id: mailLogTable.id,
      mailTo: mailLogTable.mailTo,
      mailFrom: mailLogTable.mailFrom,
      title: mailLogTable.title,
      sendStatus: mailLogTable.sendStatus,
    })
    .from(mailLogTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof MailLogPOLike;
  descend?: boolean;
  keyword?: string;
  sendStatus?: boolean;
  templateId?: string;
  startTimeUtc?: number;
  endTimeUtc?: number;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailLogTable[orderBy] || mailLogTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(mailLogTable.id).as("total") })
    .from(mailLogTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as MailLogPOLike[] };
  }

  const list = await db
    .select()
    .from(mailLogTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(mailLogTable)
    .where(eq(mailLogTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function onInsert(data: InferInsertModel<typeof mailLogTable>) {
  const result = await db
    .insert(mailLogTable)
    .values(data)
    .returning({ id: mailLogTable.id });
  return result[0]?.id;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof mailLogTable>, "id">>
) {
  const result = await db
    .update(mailLogTable)
    .set(data)
    .where(eq(mailLogTable.id, id))
    .returning({ id: mailLogTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(mailLogTable)
    .where(eq(mailLogTable.id, id))
    .returning({ id: mailLogTable.id });
  return result[0] || null;
}
