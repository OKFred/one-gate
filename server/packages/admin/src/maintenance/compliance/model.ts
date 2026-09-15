import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import {
  IndexPO,
  IndexVO,
  AuditPO,
  AuditVO,
  IndexKey,
  AuditKeys,
  type IndexKeyLike,
  type AuditAddOmitKeyLike,
  type AuditUpdateOmitKeyLike,
} from "@hodor/core/db/common/schema";
import { type RequiredKeys } from "@hodor/core/types/app";

//----------------- PO ----------------//
const ComplianceArchiveUniquePO = {
  sourceTable: {
    type: "string",
    description: "来源表名",
    examples: ["user", "order"],
    maxLength: 100,
  },
  sourcePrimaryKey: {
    type: "string",
    description: "原记录主键（字符串化）",
    examples: ["123", "uuid-xxx"],
    maxLength: 100,
  },
} as const satisfies Partial<Record<keyof ComplianceArchivePOLike, JSONSchema>>;

const ComplianceArchiveBasePO = {
  sourceSystem: {
    type: "string",
    description: "来源系统",
    examples: ["self"],
    maxLength: 100,
  },
  sourceDatabase: {
    type: "string",
    description: "来源数据库",
    examples: ["self"],
    maxLength: 100,
  },
  deleteReason: {
    type: ["string", "null"],
    nullable: true,
    description: "删除原因",
    examples: ["user_request", "retention", "security", "cleanup"],
    maxLength: 200,
  },
  deleteType: {
    type: ["string", "null"],
    nullable: true,
    description: "删除类型",
    examples: ["soft_delete", "hard_delete", "anonymize"],
    maxLength: 100,
  },
  recordSnapshot: {
    type: ["string", "null"],
    nullable: true,
    description: "原记录快照（JSON格式）",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    maxLength: 500,
  },
  restorable: {
    type: "boolean",
    description: "是否可恢复",
    examples: [true, false],
  },
  restoreUntilTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "可恢复截止时间（UTC毫秒时间戳）",
    examples: [1672531199000],
  },
  restoredTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "实际恢复时间（UTC毫秒时间戳）",
    examples: [1672531199000],
  },
  restorerId: {
    type: ["number", "null"],
    nullable: true,
    description: "恢复人ID",
    examples: [1, 2],
  },
  complianceNote: {
    type: ["string", "null"],
    nullable: true,
    description: "合规相关备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof ComplianceArchivePOLike, JSONSchema>>;

const ComplianceArchivePO = {
  ...IndexPO,
  ...ComplianceArchiveUniquePO,
  ...ComplianceArchiveBasePO,
  ...AuditPO,
} as const satisfies Record<keyof ComplianceArchivePOLike, JSONSchema>;

export type ComplianceArchivePOLike = InferSelectModel<
  typeof complianceArchiveTable
>;
type ComplianceArchiveSelectPOLike = InferInsertModel<
  typeof complianceArchiveTable
>;
type ComplianceArchiveAddPOLike = Omit<
  ComplianceArchivePOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type ComplianceArchiveUpdatePOLike = Partial<
  Omit<ComplianceArchiveSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<ComplianceArchivePOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
const ComplianceArchiveUniqueVO = ComplianceArchiveUniquePO;
const ComplianceArchiveBaseVO = ComplianceArchiveBasePO;
export const ComplianceArchiveVO = {
  ...IndexVO,
  ...ComplianceArchiveUniqueVO,
  ...ComplianceArchiveBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof ComplianceArchiveVOLike, JSONSchema>>;
export const ComplianceArchiveListVO = ComplianceArchiveVO;
export const ComplianceArchiveAddVO = {
  ...ComplianceArchiveUniqueVO,
  ...ComplianceArchiveBaseVO,
} as const satisfies Partial<Record<keyof ComplianceArchiveVOLike, JSONSchema>>;
export const ComplianceArchiveUpdateVO = {
  ...IndexVO,
  ...ComplianceArchiveUniqueVO,
  ...ComplianceArchiveBaseVO,
} as const satisfies Partial<Record<keyof ComplianceArchiveVOLike, JSONSchema>>;

export type ComplianceArchiveVOLike = ComplianceArchivePOLike;
export type ComplianceArchiveAddVOLike = Omit<
  ComplianceArchiveAddPOLike,
  "creatorId"
>;
export type ComplianceArchiveUpdateVOLike = ComplianceArchiveUpdatePOLike;
export type ComplianceArchiveDeleteVOLike = Pick<
  ComplianceArchiveVOLike,
  IndexKeyLike
>;
export type ComplianceArchiveGetVOLike = Pick<
  ComplianceArchiveVOLike,
  IndexKeyLike
>;

//----------------- Required Keys ----------------//
export const ComplianceArchiveAddKeys = [
  "sourceSystem",
  "sourceDatabase",
  "sourceTable",
  "sourcePrimaryKey",
  "deleteReason",
  "deleteType",
  "recordSnapshot",
  "remark",
  "restorable",
  "restoreUntilTimeUtc",
  "restoredTimeUtc",
  "restorerId",
  "complianceNote",
] as const satisfies RequiredKeys<ComplianceArchiveAddVOLike>[];
export const ComplianceArchiveUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ComplianceArchiveUpdateVOLike>[];
export const ComplianceArchiveDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ComplianceArchiveDeleteVOLike>[];
export const ComplianceArchiveGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ComplianceArchiveGetVOLike>[];
const ComplianceArchiveBaseKeys = [
  ...IndexKey,
  ...ComplianceArchiveAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<ComplianceArchivePOLike>[];

export const ComplianceArchiveListKeys = ComplianceArchiveBaseKeys;
export const ComplianceArchiveDetailKeys = ComplianceArchiveBaseKeys;
export const ComplianceArchiveSortableKeys = [
  "id",
  "sourceTable",
  "createTimeUtc",
  "restoredTimeUtc",
] as const satisfies RequiredKeys<ComplianceArchivePOLike>[];

export const complianceArchiveTable = sqliteTable(
  "compliance_archives",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceSystem: text("source_system", { length: 100 }).notNull(),
    sourceDatabase: text("source_database", { length: 100 }).notNull(),
    sourceTable: text("source_table", { length: 100 }).notNull(),
    sourcePrimaryKey: text("source_primary_key", { length: 100 }).notNull(),
    deleteReason: text("delete_reason", { length: 200 }),
    deleteType: text("delete_type", { length: 100 }),
    recordSnapshot: text("record_snapshot"),
    remark: text("remark", { length: 500 }),
    restorable: integer("restorable", { mode: "boolean" }).notNull(),
    restoreUntilTimeUtc: integer("restore_until_time_utc"),
    restoredTimeUtc: integer("restored_time_utc"),
    restorerId: integer("restorer_id"),
    complianceNote: text("compliance_note", { length: 500 }),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    index("compliance_archives_department_retention_idx").on(
      table.sourceSystem,
      table.sourceDatabase,
      table.sourceTable,
      table.createTimeUtc
    ),
  ]
);

export default complianceArchiveTable;
