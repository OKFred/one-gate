import { pgTable, text, boolean, jsonb, index } from "drizzle-orm/pg-core";
import {
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
  pgTimestampUtcSql,
} from "@hodor/core/db/postgresql/columns";

export function baseLogFields() {
  return {
    id: pgIdentity(),
    tenantId: pgInteger("tenant_id"),
    namespace: text("namespace").notNull(),
    remark: text("remark"),
    creatorId: pgInteger("creator_id").notNull(),
    creatorName: text("creator_name"),
    createTimeUtc: pgInteger("create_time_utc")
      .notNull()
      .default(pgTimestampUtcSql()),
  };
}

export const baseSysLogTable = pgTable(
  "base_sys_log",
  {
    ...baseLogFields(),
    logLevel: text("log_level").notNull(),
    payloadType: text("payload_type").notNull(),
    logValue: jsonb("log_value").notNull(),
  },
  (table) => [
    ...pgIntegerBounds("base_sys_log", table),
    index("idx_sys_log_namespace").on(table.namespace),
    index("idx_sys_log_tenant").on(table.tenantId),
    index("idx_sys_log_time").on(table.createTimeUtc),
  ]
);

export const baseAuditLogTable = pgTable(
  "base_audit_log",
  {
    ...baseLogFields(),
    action: text("action").notNull(),
    targetId: text("target_id"),
    payloadType: text("payload_type").notNull(),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
  },
  (table) => [
    ...pgIntegerBounds("base_audit_log", table),
    index("idx_audit_log_namespace").on(table.namespace),
    index("idx_audit_log_tenant").on(table.tenantId),
    index("idx_audit_log_time").on(table.createTimeUtc),
  ]
);

export const baseBizLogTable = pgTable(
  "base_biz_log",
  {
    ...baseLogFields(),
    status: boolean("status"),
    payloadType: text("payload_type").notNull(),
    logValue: jsonb("log_value").notNull(),
  },
  (table) => [
    ...pgIntegerBounds("base_biz_log", table),
    index("idx_biz_log_namespace").on(table.namespace),
    index("idx_biz_log_tenant").on(table.tenantId),
    index("idx_biz_log_time").on(table.createTimeUtc),
  ]
);

export const baseHttpRequestLogTable = pgTable(
  "base_http_request_log",
  {
    ...baseLogFields(),
    method: text("method").notNull(),
    url: text("url").notNull(),
    protocol: text("protocol"),
    host: text("host"),
    path: text("path"),
    query: text("query"),
    requestHeaders: jsonb("request_headers"),
    requestBody: jsonb("request_body"),
    responseStatus: pgInteger("response_status"),
    responseHeaders: jsonb("response_headers"),
    responseBody: jsonb("response_body"),
    durationMs: pgInteger("duration_ms"),
    errorMessage: text("error_message"),
  },
  (table) => [
    ...pgIntegerBounds("base_http_request_log", table),
    index("idx_http_req_log_namespace").on(table.namespace),
    index("idx_http_req_log_tenant").on(table.tenantId),
    index("idx_http_req_log_time").on(table.createTimeUtc),
  ]
);
