import db from "@/db/index";
import {
  complianceArchiveTable,
  IndexVO,
  ComplianceArchiveVO,
  ComplianceArchiveListVO,
  ComplianceArchiveListKeys,
  ComplianceArchiveDetailKeys,
  ComplianceArchiveGetKeys,
  ComplianceArchiveSortableKeys,
  type ComplianceArchivePOLike,
  type ComplianceArchiveVOLike,
  type ComplianceArchiveGetVOLike,
} from "./db.table";
import { asc, count, desc, eq, and, like } from "drizzle-orm";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { UserObj, RequiredKeys } from "@/types/app";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
import hasValue from "@/utils/hasValue";
import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@/middleware/encapsulation/common.schema";
import {
  bodyAdapter,
  bodyUserAdapter,
} from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";

// 构建查询条件
const buildWhereCondition = ({
  keyword,
  sourceTable,
  deleteReason,
  deleteType,
  restorable,
}: Pick<
  FromSchema<typeof listReq>,
  "keyword" | "sourceTable" | "deleteReason" | "deleteType" | "restorable"
>) => {
  const conditions = [];
  if (hasValue(keyword)) {
    conditions.push(
      like(complianceArchiveTable.sourcePrimaryKey, `%${keyword}%`)
    );
  }
  if (hasValue(sourceTable)) {
    conditions.push(eq(complianceArchiveTable.sourceTable, sourceTable));
  }
  if (hasValue(deleteReason)) {
    conditions.push(eq(complianceArchiveTable.deleteReason, deleteReason));
  }
  if (hasValue(deleteType)) {
    conditions.push(eq(complianceArchiveTable.deleteType, deleteType));
  }
  if (hasValue(restorable)) {
    conditions.push(eq(complianceArchiveTable.restorable, restorable));
  }
  return conditions.length > 0
    ? conditions.length === 1
      ? conditions[0]
      : and(...conditions)
    : undefined;
};

const listReq = {
  type: "object",
  properties: {
    ...listReqBase,
    keyword: {
      type: "string",
      description: "关键字搜索（主键）",
    },
    sourceTable: ComplianceArchiveVO["sourceTable"],
    deleteReason: ComplianceArchiveVO["deleteReason"],
    deleteType: ComplianceArchiveVO["deleteType"],
    restorable: ComplianceArchiveVO["restorable"],
    orderBy: orderByWrapper<(keyof ComplianceArchivePOLike)[]>(
      ComplianceArchiveSortableKeys
    ),
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;

const listRes = {
  ...listResponseWrapper<RequiredKeys<ComplianceArchivePOLike>[]>(
    {
      ...ComplianceArchiveListVO,
    },
    [...ComplianceArchiveListKeys]
  ),
} as const satisfies JSONSchema;

async function onList(
  params: FromSchema<typeof listReq>
): Promise<FromSchema<typeof listRes>> {
  const { orderBy = "id", descend = true, pageNo = 1, pageSize = 10 } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField =
    complianceArchiveTable[orderBy] || complianceArchiveTable.id;
  const maxPageSize = 1000;
  const finalPageSize = pageSize > maxPageSize ? maxPageSize : pageSize;

  // 查询总数
  const countResult = await db
    .select({ total: count(complianceArchiveTable.id).as("total") })
    .from(complianceArchiveTable)
    .where(buildWhereCondition(params));
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return {
      total,
      totalPage: 0,
      currentPage: pageNo,
      pageSize: finalPageSize,
      list: [],
    };
  }

  // 查询列表数据
  const rows = await db
    .select()
    .from(complianceArchiveTable)
    .where(buildWhereCondition(params))
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(finalPageSize)
    .offset(offset);

  const totalPage = Math.ceil(total / finalPageSize);
  return {
    total,
    totalPage,
    currentPage: pageNo,
    pageSize: finalPageSize,
    list: rows,
  };
}

const listApi = {
  req: listReq,
  res: listRes,
  pathInfo: {
    path: "/list",
    method: "post",
    summary: "获取合规归档记录列表",
  } as const,
  adapter: bodyAdapter,
  service: onList,
} satisfies API;

/**
 * 导出函数：在表记录删除时调用，将删除信息归档
 * @param data 归档数据
 * @param creatorId 创建者ID（删除人）
 * @returns 归档记录ID
 */
export async function exportDeletionRecord(
  data: {
    sourceSystem?: string;
    sourceDatabase?: string;
    sourceTable: string;
    sourcePrimaryKey: string;
    deleteReason?: string;
    deleteType?: string;
    recordSnapshot?: string;
    remark?: string;
    restorable?: boolean;
    restoreUntilTimeUtc?: number;
    complianceNote?: string;
  },
  creatorId: number
): Promise<number | null> {
  const insertData = {
    sourceSystem: data.sourceSystem || "self",
    sourceDatabase: data.sourceDatabase || "self",
    sourceTable: data.sourceTable,
    sourcePrimaryKey: data.sourcePrimaryKey,
    deleteReason: data.deleteReason || null,
    deleteType: data.deleteType || null,
    recordSnapshot: data.recordSnapshot || null,
    remark: data.remark || null,
    restorable: data.restorable ?? false,
    restoreUntilTimeUtc: data.restoreUntilTimeUtc || null,
    restoredTimeUtc: null,
    restorerId: null,
    complianceNote: data.complianceNote || null,
    creatorId,
  };

  const result = await db
    .insert(complianceArchiveTable)
    .values(insertData)
    .returning({ id: complianceArchiveTable.id });

  return result[0]?.id || null;
}

export default {
  list: listApi,
};
