import db from "@hodor/core/db/index";
import {
  workflowTable,
  workflowLogTable,
  type WorkflowPOLike,
  type WorkflowLogPOLike,
} from "./model";
import { eq, and, or, like, asc, desc, count } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

//====================================================================
// 1. Workflow Repository
//====================================================================

function buildWorkflowWhere(condition?: {
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { keyword, isEnabled } = condition || {};
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(
      or(
        like(workflowTable.name, `%${keyword}%`),
        like(workflowTable.description, `%${keyword}%`)
      )
    );
  }
  if (isEnabled !== undefined) {
    conditions.push(eq(workflowTable.isEnabled, isEnabled));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
}

export async function findWorkflowPageAll(params: {
  orderBy?: keyof WorkflowPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { orderBy = "id", descend = true } = params;
  const orderField = workflowTable[orderBy] || workflowTable.id;
  return await db
    .select()
    .from(workflowTable)
    .where(buildWorkflowWhere(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(10000);
}

export async function findWorkflowPage(params: {
  pageNo: number;
  pageSize: number;
  orderBy?: keyof WorkflowPOLike;
  descend?: boolean;
  keyword?: string;
  isEnabled?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = workflowTable[orderBy] || workflowTable.id;
  const where = buildWorkflowWhere(params);

  const countResult = await db
    .select({ total: count(workflowTable.id).as("total") })
    .from(workflowTable)
    .where(where);

  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(workflowTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findWorkflowById(id: number) {
  const rows = await db
    .select()
    .from(workflowTable)
    .where(eq(workflowTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function onWorkflowInsert(
  data: InferInsertModel<typeof workflowTable>
) {
  const result = await db
    .insert(workflowTable)
    .values(data)
    .returning({ id: workflowTable.id });
  return result[0]?.id;
}

export async function onWorkflowUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof workflowTable>, "id">>
) {
  const result = await db
    .update(workflowTable)
    .set(data)
    .where(eq(workflowTable.id, id))
    .returning({ id: workflowTable.id });
  return result[0] || null;
}

export async function onWorkflowDelete(id: number) {
  const result = await db
    .delete(workflowTable)
    .where(eq(workflowTable.id, id))
    .returning({ id: workflowTable.id });
  return result[0] || null;
}

//====================================================================
// 3. Workflow Log Repository
//====================================================================

export async function findLogPage(params: {
  pageNo: number;
  pageSize: number;
  workflowId: number;
}) {
  const { pageNo, pageSize, workflowId } = params;
  const offset = (pageNo - 1) * pageSize;

  const countResult = await db
    .select({ total: count(workflowLogTable.id).as("total") })
    .from(workflowLogTable)
    .where(eq(workflowLogTable.workflowId, workflowId));

  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(workflowLogTable)
    .where(eq(workflowLogTable.workflowId, workflowId))
    .orderBy(desc(workflowLogTable.id))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function findLogById(id: number) {
  const rows = await db
    .select()
    .from(workflowLogTable)
    .where(eq(workflowLogTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function onLogInsert(
  data: InferInsertModel<typeof workflowLogTable>
) {
  const result = await db
    .insert(workflowLogTable)
    .values(data)
    .returning({ id: workflowLogTable.id });
  return result[0]?.id;
}

export async function onLogUpdate(
  id: number,
  data: Partial<Omit<InferInsertModel<typeof workflowLogTable>, "id">>
) {
  const result = await db
    .update(workflowLogTable)
    .set(data)
    .where(eq(workflowLogTable.id, id))
    .returning({ id: workflowLogTable.id });
  return result[0] || null;
}
