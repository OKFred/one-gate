import db from "@hodor/core/db/index";
import {
  baseSysLogTable,
  baseAuditLogTable,
  baseBizLogTable,
  type SysLogPOLike,
  type AuditLogPOLike,
  type BizLogPOLike,
} from "./model";
import { eq, asc, desc, count, and, sql, type SQL } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

// ----------------- Sys Log -----------------

export async function insertSysLog(
  data: InferInsertModel<typeof baseSysLogTable>
) {
  const result = await db
    .insert(baseSysLogTable)
    .values(data)
    .returning({ id: baseSysLogTable.id });
  return result[0]?.id;
}

export async function findSysLogPage(params: {
  namespace?: string;
  creatorId?: number;
  pageNo: number;
  pageSize: number;
  orderBy?: keyof SysLogPOLike;
  descend?: boolean;
  filters?: Record<string, unknown>;
}) {
  const {
    namespace,
    creatorId,
    pageNo,
    pageSize,
    orderBy = "id",
    descend = true,
    filters,
  } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = baseSysLogTable[orderBy] || baseSysLogTable.id;

  const conditions: SQL[] = [];
  if (namespace !== undefined && namespace !== null) {
    conditions.push(eq(baseSysLogTable.namespace, namespace));
  }
  if (creatorId !== undefined && creatorId !== null) {
    conditions.push(eq(baseSysLogTable.creatorId, creatorId));
  }
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) {
        conditions.push(
          sql`json_extract(${baseSysLogTable.logValue}, '$.' || ${k}) = ${v}`
        );
      }
    }
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ total: count(baseSysLogTable.id).as("total") })
    .from(baseSysLogTable)
    .where(whereClause);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as SysLogPOLike[] };
  }

  const list = await db
    .select()
    .from(baseSysLogTable)
    .where(whereClause)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

// ----------------- Audit Log -----------------

export async function insertAuditLog(
  data: InferInsertModel<typeof baseAuditLogTable>
) {
  const result = await db
    .insert(baseAuditLogTable)
    .values(data)
    .returning({ id: baseAuditLogTable.id });
  return result[0]?.id;
}

export async function findAuditLogPage(params: {
  namespace?: string;
  pageNo: number;
  pageSize: number;
  orderBy?: keyof AuditLogPOLike;
  descend?: boolean;
}) {
  const {
    namespace,
    pageNo,
    pageSize,
    orderBy = "id",
    descend = true,
  } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = baseAuditLogTable[orderBy] || baseAuditLogTable.id;

  const conditions: SQL[] = [];
  if (namespace !== undefined && namespace !== null) {
    conditions.push(eq(baseAuditLogTable.namespace, namespace));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ total: count(baseAuditLogTable.id).as("total") })
    .from(baseAuditLogTable)
    .where(whereClause);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as AuditLogPOLike[] };
  }

  const list = await db
    .select()
    .from(baseAuditLogTable)
    .where(whereClause)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

// ----------------- Biz Log -----------------

export async function insertBizLog(
  data: InferInsertModel<typeof baseBizLogTable>
) {
  const result = await db
    .insert(baseBizLogTable)
    .values(data)
    .returning({ id: baseBizLogTable.id });
  return result[0]?.id;
}

export async function findBizLogPage(params: {
  namespace?: string;
  pageNo: number;
  pageSize: number;
  orderBy?: keyof BizLogPOLike;
  descend?: boolean;
  filters?: Record<string, unknown>;
  likeFilters?: Record<string, string>;
  status?: boolean;
  startTime?: number;
  endTime?: number;
}) {
  const {
    namespace,
    pageNo,
    pageSize,
    orderBy = "id",
    descend = true,
    filters,
    likeFilters,
    status,
    startTime,
    endTime,
  } = params;
  const offset = (pageNo - 1) * pageSize;
  const orderField = baseBizLogTable[orderBy] || baseBizLogTable.id;

  const conditions: SQL[] = [];
  if (namespace !== undefined && namespace !== null) {
    conditions.push(eq(baseBizLogTable.namespace, namespace));
  }
  if (status !== undefined && status !== null) {
    conditions.push(eq(baseBizLogTable.status, status));
  }
  if (startTime !== undefined) {
    conditions.push(sql`${baseBizLogTable.createTimeUtc} >= ${startTime}`);
  }
  if (endTime !== undefined) {
    conditions.push(sql`${baseBizLogTable.createTimeUtc} <= ${endTime}`);
  }
  if (filters) {
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) {
        conditions.push(
          sql`json_extract(${baseBizLogTable.logValue}, '$.' || ${k}) = ${v}`
        );
      }
    }
  }
  if (likeFilters) {
    for (const [k, v] of Object.entries(likeFilters)) {
      if (v !== undefined && v !== null && v !== "") {
        const pattern = `%${v}%`;
        conditions.push(
          sql`json_extract(${baseBizLogTable.logValue}, '$.' || ${k}) LIKE ${pattern}`
        );
      }
    }
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ total: count(baseBizLogTable.id).as("total") })
    .from(baseBizLogTable)
    .where(whereClause);
  const total = countResult[0]?.total || 0;

  if (total === 0) {
    return { total, list: [] as BizLogPOLike[] };
  }

  const list = await db
    .select()
    .from(baseBizLogTable)
    .where(whereClause)
    .orderBy(!descend ? asc(orderField) : desc(orderField))
    .limit(pageSize)
    .offset(offset);

  return { total, list };
}

// Utilities for standard ID fetches
export async function findSysLogById(id: number) {
  const rows = await db
    .select()
    .from(baseSysLogTable)
    .where(eq(baseSysLogTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function findAuditLogById(id: number) {
  const rows = await db
    .select()
    .from(baseAuditLogTable)
    .where(eq(baseAuditLogTable.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function findBizLogById(id: number) {
  const rows = await db
    .select()
    .from(baseBizLogTable)
    .where(eq(baseBizLogTable.id, id))
    .limit(1);
  return rows[0] || null;
}

// ----------------- Timeline Cursor Utilities -----------------
import { inArray, lte } from "drizzle-orm";

export async function findTimelineChunkSys(params: {
  cursor?: number;
  limit: number;
  namespaces?: string[];
}) {
  const conditions: SQL[] = [];
  if (params.namespaces && params.namespaces.length > 0) {
    conditions.push(inArray(baseSysLogTable.namespace, params.namespaces));
  }
  if (params.cursor !== undefined) {
    conditions.push(lte(baseSysLogTable.createTimeUtc, params.cursor));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(baseSysLogTable)
    .where(whereClause)
    .orderBy(desc(baseSysLogTable.createTimeUtc), desc(baseSysLogTable.id))
    .limit(params.limit);
}

export async function findTimelineChunkAudit(params: {
  cursor?: number;
  limit: number;
  namespaces?: string[];
}) {
  const conditions: SQL[] = [];
  if (params.namespaces && params.namespaces.length > 0) {
    conditions.push(inArray(baseAuditLogTable.namespace, params.namespaces));
  }
  if (params.cursor !== undefined) {
    conditions.push(lte(baseAuditLogTable.createTimeUtc, params.cursor));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(baseAuditLogTable)
    .where(whereClause)
    .orderBy(desc(baseAuditLogTable.createTimeUtc), desc(baseAuditLogTable.id))
    .limit(params.limit);
}

export async function findTimelineChunkBiz(params: {
  cursor?: number;
  limit: number;
  namespaces?: string[];
}) {
  const conditions: SQL[] = [];
  if (params.namespaces && params.namespaces.length > 0) {
    conditions.push(inArray(baseBizLogTable.namespace, params.namespaces));
  }
  if (params.cursor !== undefined) {
    conditions.push(lte(baseBizLogTable.createTimeUtc, params.cursor));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return db
    .select()
    .from(baseBizLogTable)
    .where(whereClause)
    .orderBy(desc(baseBizLogTable.createTimeUtc), desc(baseBizLogTable.id))
    .limit(params.limit);
}
