import db from "@hodor/core/db/index";
import { mailTemplateTable, type MailTemplatePOLike } from "./model";
import { eq, and, or, like, asc, desc, count, type SQL } from "drizzle-orm";
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
        like(mailTemplateTable.name, `%${keyword}%`),
        like(mailTemplateTable.title, `%${keyword}%`),
        like(mailTemplateTable.category, `%${keyword}%`)
      ) as SQL<unknown>
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(mailTemplateTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findPageAll(params: {
  orderBy?: keyof MailTemplatePOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = mailTemplateTable[orderBy] || mailTemplateTable.id;
  const maxLimit = 10000;
  const rows = await db
    .select({
      id: mailTemplateTable.id,
      name: mailTemplateTable.name,
      title: mailTemplateTable.title,
      langCode: mailTemplateTable.langCode,
      content: mailTemplateTable.content,
      category: mailTemplateTable.category,
      isEnabled: mailTemplateTable.isEnabled,
    })
    .from(mailTemplateTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(maxLimit);
  return rows;
}

export async function findPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof MailTemplatePOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = mailTemplateTable[orderBy] || mailTemplateTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(mailTemplateTable.id).as("total") })
    .from(mailTemplateTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as MailTemplatePOLike[] };
  }

  const list = await db
    .select()
    .from(mailTemplateTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findById(id: number) {
  const rows = await db
    .select()
    .from(mailTemplateTable)
    .where(eq(mailTemplateTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function findByName(name: string) {
  const rows = await db
    .select()
    .from(mailTemplateTable)
    .where(eq(mailTemplateTable.name, name))
    .limit(1);
  return rows[0] || null;
}

export async function onInsert(
  data: InferInsertModel<typeof mailTemplateTable>
) {
  const result = await db
    .insert(mailTemplateTable)
    .values(data)
    .returning({ id: mailTemplateTable.id });
  return result[0]?.id;
}

export async function onUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof mailTemplateTable>, "id">>
) {
  const result = await db
    .update(mailTemplateTable)
    .set(data)
    .where(eq(mailTemplateTable.id, id))
    .returning({ id: mailTemplateTable.id });
  return result[0] || null;
}

export async function onDelete(id: number) {
  const result = await db
    .delete(mailTemplateTable)
    .where(eq(mailTemplateTable.id, id))
    .returning({ id: mailTemplateTable.id });
  return result[0] || null;
}
