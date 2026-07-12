import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
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

export { IndexVO };

//====================================================================
// 1. Workflow PO, VO & Table
//====================================================================

export const WorkflowBasePO = {
  name: {
    type: "string",
    description: "工作流名称",
    maxLength: 100,
  },
  description: {
    type: ["string", "null"],
    nullable: true,
    description: "描述信息",
    maxLength: 500,
  },
  flowData: {
    type: "string",
    description: "图节点与连线数据 (React Flow JSON)",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof WorkflowPOLike, JSONSchema>>;

export const WorkflowVO = {
  ...IndexVO,
  ...WorkflowBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof WorkflowVOLike, JSONSchema>>;

export const WorkflowAddVO = WorkflowBasePO;
export const WorkflowUpdateVO = {
  ...IndexVO,
  ...WorkflowBasePO,
} as const satisfies Partial<Record<keyof WorkflowVOLike, JSONSchema>>;

export type WorkflowPOLike = InferSelectModel<typeof workflowTable>;
type WorkflowSelectPOLike = InferInsertModel<typeof workflowTable>;
export type WorkflowAddPOLike = Omit<
  WorkflowPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
export type WorkflowUpdatePOLike = Partial<
  Omit<WorkflowSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<WorkflowPOLike, IndexKeyLike>;

export type WorkflowVOLike = WorkflowPOLike;

export const WorkflowAddKeys = [
  "name",
  "flowData",
  "isEnabled",
] as const satisfies RequiredKeys<WorkflowAddPOLike>[];
export const WorkflowUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<WorkflowUpdatePOLike>[];
export const WorkflowDeleteKeys = [...IndexKey] as const satisfies RequiredKeys<
  Pick<WorkflowPOLike, IndexKeyLike>
>[];
export const WorkflowGetKeys = [...IndexKey] as const satisfies RequiredKeys<
  Pick<WorkflowPOLike, IndexKeyLike>
>[];
export const WorkflowListKeys = [
  ...IndexKey,
  "name",
  "description",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<WorkflowVOLike>[];

export const WorkflowSortableKeys = [
  "id",
  "name",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<WorkflowPOLike>[];

export const workflowTable = sqliteTable("enterprise_workflow", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  flowData: text("flow_data").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

//====================================================================
// 2. Workflow Log PO, VO & Table
//====================================================================

export const WorkflowLogBasePO = {
  workflowId: {
    type: "number",
    description: "关联的工作流ID",
  },
  status: {
    type: "string",
    description: "执行状态 ('running' | 'success' | 'failed')",
    enum: ["running", "success", "failed"],
  },
  triggerType: {
    type: "string",
    description: "触发类型 ('manual' | 'cron')",
    enum: ["manual", "cron"],
  },
  startTimeUtc: {
    type: "number",
    description: "开始执行时间",
  },
  endTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "结束执行时间",
  },
  logs: {
    type: ["string", "null"],
    nullable: true,
    description: "步骤运行过程详细日志 JSON",
  },
} as const satisfies Partial<Record<keyof WorkflowLogPOLike, JSONSchema>>;

export const WorkflowLogVO = {
  ...IndexVO,
  ...WorkflowLogBasePO,
  creatorId: { type: "number", description: "创建者ID" },
  createTimeUtc: { type: "number", description: "创建时间" },
} as const satisfies Partial<Record<keyof WorkflowLogVOLike, JSONSchema>>;

export type WorkflowLogPOLike = InferSelectModel<typeof workflowLogTable>;
type WorkflowLogSelectPOLike = InferInsertModel<typeof workflowLogTable>;
export type WorkflowLogAddPOLike = Omit<
  WorkflowLogPOLike,
  IndexKeyLike | "createTimeUtc"
>;

export type WorkflowLogVOLike = WorkflowLogPOLike;

export const WorkflowLogAddKeys = [
  "workflowId",
  "status",
  "triggerType",
  "startTimeUtc",
] as const satisfies RequiredKeys<WorkflowLogAddPOLike>[];
export const WorkflowLogGetKeys = [...IndexKey] as const satisfies RequiredKeys<
  Pick<WorkflowLogPOLike, IndexKeyLike>
>[];
export const WorkflowLogListKeys = [
  ...IndexKey,
  "workflowId",
  "status",
  "triggerType",
  "startTimeUtc",
  "endTimeUtc",
  "creatorId",
  "createTimeUtc",
] as const satisfies RequiredKeys<WorkflowLogVOLike>[];

export const WorkflowLogSortableKeys = [
  "id",
  "startTimeUtc",
  "createTimeUtc",
] as const satisfies RequiredKeys<WorkflowLogPOLike>[];

export const workflowLogTable = sqliteTable("enterprise_workflow_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workflowId: integer("workflow_id").notNull(),
  status: text("status").notNull(), // 'running' | 'success' | 'failed'
  triggerType: text("trigger_type").notNull(), // 'manual' | 'cron'
  startTimeUtc: integer("start_time_utc").notNull(),
  endTimeUtc: integer("end_time_utc"),
  logs: text("logs"), // json array
  creatorId: integer("creator_id").notNull(),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
});
