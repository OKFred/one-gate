import db from "@/db/index";
import { cronTable, cronLogTable, type CronPOLike } from "./model";
import { eq, and, or, like, desc, asc, count } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  status?: boolean;
}) {
  const { keyword, status } = condition || {};
  const conditions = [];

  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(cronTable.name, `%${keyword}%`),
        like(cronTable.jobKey, `%${keyword}%`)
      )
    );
  }
  if (hasValue(status)) {
    conditions.push(eq(cronTable.status, status));
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
  orderBy?: keyof CronPOLike;
  descend?: boolean;
  keyword?: string;
  status?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = cronTable[orderBy] || cronTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(cronTable.id) })
    .from(cronTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(cronTable)
    .where(where)
    .orderBy(descend ? desc(orderField) : asc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(cronTable)
    .where(eq(cronTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function onInsert(data: InferInsertModel<typeof cronTable>) {
  const result = await db
    .insert(cronTable)
    .values(data)
    .returning({ id: cronTable.id });
  return result[0]?.id || null;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof cronTable>, "id">>
) {
  const result = await db
    .update(cronTable)
    .set(data)
    .where(eq(cronTable.id, id))
    .returning({ id: cronTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  return await db.transaction(async (tx) => {
    const deletedCron = await tx
      .delete(cronTable)
      .where(eq(cronTable.id, id))
      .returning({ id: cronTable.id });

    if (deletedCron[0]) {
      await tx.delete(cronLogTable).where(eq(cronLogTable.jobId, id));
    }
    return deletedCron[0] || null;
  });
}

export async function findLogsPage(params: {
  jobId: number;
  pageNo: number;
  pageSize: number;
}) {
  const { jobId, pageNo, pageSize } = params;
  const offset = (pageNo - 1) * pageSize;

  const countResult = await db
    .select({ total: count(cronLogTable.id) })
    .from(cronLogTable)
    .where(eq(cronLogTable.jobId, jobId));
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(cronLogTable)
    .where(eq(cronLogTable.jobId, jobId))
    .orderBy(desc(cronLogTable.id))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}
