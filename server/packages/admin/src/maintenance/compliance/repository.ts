import db from "@hodor/core/db/index";
import { complianceArchiveTable, type ComplianceArchivePOLike } from "./model";
import { eq, and, like, count, desc, asc, type SQL } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import hasValue from "@hodor/core/utils/hasValue";

function buildWhereCondition(condition?: {
  keyword?: string;
  sourceTable?: string;
  deleteReason?: string;
  deleteType?: string;
  restorable?: boolean;
}) {
  const { keyword, sourceTable, deleteReason, deleteType, restorable } =
    condition || {};
  const conditions: SQL<unknown>[] = [];

  if (hasValue(keyword)) {
    conditions.push(
      like(complianceArchiveTable.sourcePrimaryKey, `%${keyword}%`)
    );
  }
  if (hasValue(sourceTable)) {
    conditions.push(
      eq(complianceArchiveTable.sourceTable, sourceTable as string)
    );
  }
  if (hasValue(deleteReason)) {
    conditions.push(
      eq(complianceArchiveTable.deleteReason, deleteReason as string)
    );
  }
  if (hasValue(deleteType)) {
    conditions.push(
      eq(complianceArchiveTable.deleteType, deleteType as string)
    );
  }
  if (hasValue(restorable)) {
    conditions.push(
      eq(complianceArchiveTable.restorable, restorable as boolean)
    );
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
  orderBy?: keyof ComplianceArchivePOLike;
  descend?: boolean;
  keyword?: string;
  sourceTable?: string;
  deleteReason?: string;
  deleteType?: string;
  restorable?: boolean;
}) {
  const { pageNo, pageSize, orderBy = "id", descend = true } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField =
    complianceArchiveTable[orderBy] || complianceArchiveTable.id;
  const where = buildWhereCondition(params);

  const countResult = await db
    .select({ total: count(complianceArchiveTable.id).as("total") })
    .from(complianceArchiveTable)
    .where(where);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] };
  }

  const list = await db
    .select()
    .from(complianceArchiveTable)
    .where(where)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

export async function onInsert(
  data: InferInsertModel<typeof complianceArchiveTable>
) {
  const result = await db
    .insert(complianceArchiveTable)
    .values(data)
    .returning({ id: complianceArchiveTable.id });
  return result[0]?.id || null;
}
