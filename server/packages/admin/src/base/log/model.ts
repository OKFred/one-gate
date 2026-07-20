import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { type JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import {
  IndexPO,
  IndexVO,
  IndexKey,
  type IndexKeyLike,
} from "@hodor/core/db/common/schema";
import { type RequiredKeys } from "@hodor/core/types/app";

//----------------- Base Fields ----------------//

export const baseLogFields = {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: integer("tenant_id"),
  namespace: text("namespace").notNull(),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  creatorName: text("creator_name"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
};

//----------------- Tables ----------------//

export const baseSysLogTable = sqliteTable(
  "base_sys_log",
  {
    ...baseLogFields,
    logLevel: text("log_level").notNull(),
    payloadType: text("payload_type").notNull(),
    logValue: text("log_value", { mode: "json" }).notNull(),
  },
  (table) => ({
    namespaceIdx: index("idx_sys_log_namespace").on(table.namespace),
    tenantIdx: index("idx_sys_log_tenant").on(table.tenantId),
    timeIdx: index("idx_sys_log_time").on(table.createTimeUtc),
  })
);

export const baseAuditLogTable = sqliteTable(
  "base_audit_log",
  {
    ...baseLogFields,
    action: text("action").notNull(),
    targetId: text("target_id"),
    payloadType: text("payload_type").notNull(),
    beforeData: text("before_data", { mode: "json" }),
    afterData: text("after_data", { mode: "json" }),
  },
  (table) => ({
    namespaceIdx: index("idx_audit_log_namespace").on(table.namespace),
    tenantIdx: index("idx_audit_log_tenant").on(table.tenantId),
    timeIdx: index("idx_audit_log_time").on(table.createTimeUtc),
  })
);

export const baseBizLogTable = sqliteTable(
  "base_biz_log",
  {
    ...baseLogFields,
    status: integer("status"),
    payloadType: text("payload_type").notNull(),
    logValue: text("log_value", { mode: "json" }).notNull(),
  },
  (table) => ({
    namespaceIdx: index("idx_biz_log_namespace").on(table.namespace),
    tenantIdx: index("idx_biz_log_tenant").on(table.tenantId),
    timeIdx: index("idx_biz_log_time").on(table.createTimeUtc),
  })
);

//----------------- PO / VO ----------------//

export const BaseLogBasePO = {
  tenantId: {
    type: ["number", "null"],
    nullable: true,
    description: "租户ID",
  },
  namespace: {
    type: "string",
    description: "命名空间",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
  },
  creatorId: {
    type: "number",
    description: "创建人ID",
  },
  creatorName: {
    type: ["string", "null"],
    nullable: true,
    description: "创建人名称",
  },
  createTimeUtc: {
    type: "number",
    description: "创建时间(UTC)",
  },
} as const;

export const SysLogBasePO = {
  ...BaseLogBasePO,
  logLevel: {
    type: "string",
    description: "日志级别",
  },
  payloadType: {
    type: "string",
    description: "数据格式",
  },
  logValue: {
    type: "object",
    additionalProperties: true,
    description: "明细内容",
  },
} as const satisfies Partial<
  Record<keyof InferSelectModel<typeof baseSysLogTable>, JSONSchema>
>;

export const AuditLogBasePO = {
  ...BaseLogBasePO,
  action: {
    type: "string",
    description: "操作动作",
  },
  targetId: {
    type: ["string", "null"],
    nullable: true,
    description: "目标ID",
  },
  payloadType: {
    type: "string",
    description: "数据格式",
  },
  beforeData: {
    type: ["object", "null"],
    nullable: true,
    additionalProperties: true,
    description: "变更前数据",
  },
  afterData: {
    type: ["object", "null"],
    nullable: true,
    additionalProperties: true,
    description: "变更后数据",
  },
} as const satisfies Partial<
  Record<keyof InferSelectModel<typeof baseAuditLogTable>, JSONSchema>
>;

export const BizLogBasePO = {
  ...BaseLogBasePO,
  status: {
    type: ["number", "null"],
    nullable: true,
    description: "状态 (1成功, 0失败)",
  },
  payloadType: {
    type: "string",
    description: "数据格式",
  },
  logValue: {
    type: "object",
    additionalProperties: true,
    description: "明细内容",
  },
} as const satisfies Partial<
  Record<keyof InferSelectModel<typeof baseBizLogTable>, JSONSchema>
>;

export type SysLogPOLike = InferSelectModel<typeof baseSysLogTable>;
export type AuditLogPOLike = InferSelectModel<typeof baseAuditLogTable>;
export type BizLogPOLike = InferSelectModel<typeof baseBizLogTable>;

export { IndexVO };
export const SysLogVO = {
  ...IndexVO,
  ...SysLogBasePO,
} as const satisfies Partial<Record<keyof SysLogPOLike, JSONSchema>>;

export const AuditLogVO = {
  ...IndexVO,
  ...AuditLogBasePO,
} as const satisfies Partial<Record<keyof AuditLogPOLike, JSONSchema>>;

export const BizLogVO = {
  ...IndexVO,
  ...BizLogBasePO,
} as const satisfies Partial<Record<keyof BizLogPOLike, JSONSchema>>;

export const SysLogSortableKeys = [
  "id",
  "namespace",
  "logLevel",
  "createTimeUtc",
] as const satisfies RequiredKeys<SysLogPOLike>[];

export const AuditLogSortableKeys = [
  "id",
  "namespace",
  "action",
  "createTimeUtc",
] as const satisfies RequiredKeys<AuditLogPOLike>[];

export const BizLogSortableKeys = [
  "id",
  "namespace",
  "status",
  "createTimeUtc",
] as const satisfies RequiredKeys<BizLogPOLike>[];

import {
  listReqBase,
  listResponseWrapper,
  orderByWrapper,
} from "@hodor/core/middleware/encapsulation/common.schema";

export const LogSysListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    namespace: { type: "string" },
    orderBy: orderByWrapper<(typeof SysLogSortableKeys)[number][]>([
      ...SysLogSortableKeys,
    ]),
  },
} as const satisfies JSONSchema;

export const LogSysListRes = listResponseWrapper(SysLogVO);

export const LogAuditListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    namespace: { type: "string" },
    orderBy: orderByWrapper<(typeof AuditLogSortableKeys)[number][]>([
      ...AuditLogSortableKeys,
    ]),
  },
} as const satisfies JSONSchema;

export const LogAuditListRes = listResponseWrapper(AuditLogVO);

export const LogBizListReq = {
  type: "object",
  properties: {
    ...listReqBase,
    namespace: { type: "string" },
    orderBy: orderByWrapper<(typeof BizLogSortableKeys)[number][]>([
      ...BizLogSortableKeys,
    ]),
  },
} as const satisfies JSONSchema;

export const LogBizListRes = listResponseWrapper(BizLogVO);

export const LogTimelineReq = {
  type: "object",
  properties: {
    namespaces: {
      type: "array",
      items: { type: "string" },
      description: "要筛选的命名空间列表",
    },
    types: {
      type: "array",
      items: { type: "string", enum: ["sys", "audit", "biz"] },
      description: "要查的日志类型",
    },
    limit: {
      type: "number",
      description: "返回的最大条数",
      default: 50,
    },
    cursor: {
      type: "number",
      description: "上一页最后一条的 createTimeUtc，第一页留空",
    },
  },
} as const satisfies JSONSchema;

export const LogTimelineResItem = {
  type: "object",
  properties: {
    ...BaseLogBasePO,
    logType: { type: "string", enum: ["sys", "audit", "biz"] },
    id: IndexVO.id,
    // 聚合一些公用字段
    action: { type: "string", nullable: true }, // from audit
    level: { type: "string", nullable: true }, // from sys
    status: { type: "number", nullable: true }, // from biz
    logValue: { type: "object", additionalProperties: true, nullable: true }, // from sys or biz
    diffValue: { type: "object", additionalProperties: true, nullable: true }, // from audit (before/after combined or separate)
    beforeData: { type: "object", additionalProperties: true, nullable: true },
    afterData: { type: "object", additionalProperties: true, nullable: true },
  },
} as const satisfies JSONSchema;

export const LogTimelineRes = {
  type: "object",
  properties: {
    list: {
      type: "array",
      items: LogTimelineResItem,
    },
    nextCursor: {
      type: "number",
      description: "下一页的游标",
      nullable: true,
    },
    hasMore: {
      type: "boolean",
    },
  },
  required: ["list", "hasMore"],
} as const satisfies JSONSchema;
