import db from "@hodor/core/db/index";
import { mailRecipientTable, type MailRecipientPOLike } from "./model";
import {
  eq,
  asc,
  desc,
  count,
  and,
  like,
  notInArray,
  type SQL,
} from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

export async function insertRecipient(
  data: InferInsertModel<typeof mailRecipientTable>
) {
  const result = await db
    .insert(mailRecipientTable)
    .values(data)
    .returning({ id: mailRecipientTable.id });
  return result[0]?.id;
}

export async function updateRecipient(
  id: number,
  data: Partial<InferInsertModel<typeof mailRecipientTable>>
) {
  const result = await db
    .update(mailRecipientTable)
    .set({
      ...data,
      updateTimeUtc: Date.now(),
    })
    .where(eq(mailRecipientTable.id, id))
    .returning({ id: mailRecipientTable.id });
  return result[0]?.id;
}

export async function deleteRecipient(id: number) {
  const result = await db
    .delete(mailRecipientTable)
    .where(eq(mailRecipientTable.id, id))
    .returning({ id: mailRecipientTable.id });
  return result[0]?.id;
}

export async function findRecipientById(id: number) {
  const rows = await db
    .select()
    .from(mailRecipientTable)
    .where(eq(mailRecipientTable.id, id))
    .limit(1);
  return rows[0] || null;
}

function buildWhereCondition(params: {
  keyword?: string;
  scope?: "sys" | "biz" | "user";
  tenantId?: number;
  userId?: number;
  remoteLoginWarn?: boolean;
  marketingEdm?: boolean;
}) {
  const conditions: SQL[] = [];
  if (params.scope) {
    conditions.push(eq(mailRecipientTable.scope, params.scope));
  }
  if (params.tenantId !== undefined) {
    conditions.push(eq(mailRecipientTable.tenantId, params.tenantId));
  }
  if (params.userId !== undefined) {
    conditions.push(eq(mailRecipientTable.userId, params.userId));
  }
  if (params.remoteLoginWarn !== undefined) {
    conditions.push(
      eq(mailRecipientTable.remoteLoginWarn, params.remoteLoginWarn)
    );
  }
  if (params.marketingEdm !== undefined) {
    conditions.push(eq(mailRecipientTable.marketingEdm, params.marketingEdm));
  }
  if (params.keyword) {
    const kw = `%${params.keyword}%`;
    conditions.push(like(mailRecipientTable.email, kw));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findRecipientPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof MailRecipientPOLike;
  descend?: boolean;
  keyword?: string;
  scope?: "sys" | "biz" | "user";
  tenantId?: number;
  userId?: number;
  remoteLoginWarn?: boolean;
  marketingEdm?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailRecipientTable[orderBy] || mailRecipientTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(mailRecipientTable.id).as("total") })
    .from(mailRecipientTable)
    .where(where);

  const total = Number(countResult[0]?.total || 0);

  const list = await db
    .select()
    .from(mailRecipientTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findUserRecipientPreference(userId: number) {
  const rows = await db
    .select()
    .from(mailRecipientTable)
    .where(
      and(
        eq(mailRecipientTable.userId, userId),
        eq(mailRecipientTable.scope, "user")
      )
    )
    .limit(1);
  return rows[0] || null;
}

export async function upsertUserRecipientPreference(
  userId: number,
  userEmail: string,
  preference: {
    remoteLoginWarn?: boolean;
    marketingEdm?: boolean;
  }
) {
  const existing = await findUserRecipientPreference(userId);
  if (existing) {
    await updateRecipient(existing.id, preference);
    return existing.id;
  } else {
    return await insertRecipient({
      userId,
      email: userEmail,
      scope: "user",
      remoteLoginWarn: preference.remoteLoginWarn ?? true,
      marketingEdm: preference.marketingEdm ?? true,
      creatorId: userId,
      createTimeUtc: Date.now(),
    });
  }
}
