import { and, desc, eq, like, not, or, type SQL } from "drizzle-orm";
import db from "@hodor/core/db/index";
import {
  webhookConfigTable,
  type WebhookConfigInsertPOLike,
  type WebhookConfigPOLike,
} from "./model.js";

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  source?: string;
  keyword?: string;
  isEnabled?: boolean;
  orderBy?: keyof WebhookConfigPOLike;
  descend?: boolean;
}) {
  const conditions: SQL<unknown>[] = [];
  if (params.source) {
    conditions.push(eq(webhookConfigTable.source, params.source));
  }
  if (params.isEnabled !== undefined) {
    conditions.push(eq(webhookConfigTable.isEnabled, params.isEnabled));
  }
  if (params.keyword) {
    conditions.push(
      or(
        like(webhookConfigTable.source, `%${params.keyword}%`),
        like(webhookConfigTable.remark, `%${params.keyword}%`)
      )!
    );
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;
  const orderColumn = params.orderBy
    ? webhookConfigTable[params.orderBy]
    : webhookConfigTable.id;
  const listQuery = db
    .select()
    .from(webhookConfigTable)
    .where(whereClause)
    .orderBy(params.descend === false ? orderColumn : desc(orderColumn))
    .limit(params.pageSize)
    .offset((params.pageNo - 1) * params.pageSize);
  const [list, total] = await Promise.all([
    listQuery,
    db.$count(webhookConfigTable, whereClause),
  ]);
  return { list, total };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(webhookConfigTable)
    .where(eq(webhookConfigTable.id, id))
    .limit(1);
  return rows[0];
}

export async function findPrimaryEnabledBySource(source: string) {
  const rows = await db
    .select()
    .from(webhookConfigTable)
    .where(
      and(
        eq(webhookConfigTable.source, source),
        eq(webhookConfigTable.isEnabled, true),
        eq(webhookConfigTable.isPrimary, true)
      )
    )
    .limit(1);
  return rows[0];
}

export async function resetPrimaryFlags(source: string, excludeId?: number) {
  const conditions: SQL<unknown>[] = [eq(webhookConfigTable.source, source)];
  if (excludeId !== undefined) {
    conditions.push(not(eq(webhookConfigTable.id, excludeId)));
  }
  await db
    .update(webhookConfigTable)
    .set({ isPrimary: false })
    .where(and(...conditions));
}

export async function onInsert(data: WebhookConfigInsertPOLike) {
  const rows = await db
    .insert(webhookConfigTable)
    .values(data)
    .returning({ id: webhookConfigTable.id });
  return rows[0]?.id ?? null;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<WebhookConfigInsertPOLike, "id">>
) {
  const rows = await db
    .update(webhookConfigTable)
    .set(data)
    .where(eq(webhookConfigTable.id, id))
    .returning({ id: webhookConfigTable.id });
  return rows[0] ?? null;
}

export async function onDelete(id: number) {
  const rows = await db
    .delete(webhookConfigTable)
    .where(eq(webhookConfigTable.id, id))
    .returning({ id: webhookConfigTable.id });
  return rows[0] ?? null;
}
