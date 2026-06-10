import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@/utils/timestamp";
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
} from "@/db/common/schema";
import { type RequiredKeys } from "@/types/app";

//----------------- PO ----------------//
const CronBasePO = {
  jobKey: {
    type: "string",
    description: "任务唯一标识键",
    maxLength: 100,
  },
  name: {
    type: "string",
    description: "任务名称",
    maxLength: 100,
  },
  cronExpression: {
    type: "string",
    description: "Cron 表达式",
    maxLength: 100,
  },
  status: {
    type: "number",
    description: "状态 (0: 禁用, 1: 启用)",
    enum: [0, 1],
  },
  parameters: {
    type: ["string", "null"],
    nullable: true,
    description: "JSON 格式参数",
    maxLength: 1000,
  },
  lastRunTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "上次运行的毫秒时间戳",
  },
  nextRunTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "下次运行的毫秒时间戳",
  },
  runCount: {
    type: "number",
    description: "累计运行次数",
  },
} as const satisfies Partial<Record<keyof CronPOLike, JSONSchema>>;

const CronPO = {
  ...IndexPO,
  ...CronBasePO,
  ...AuditPO,
} as const satisfies Record<keyof CronPOLike, JSONSchema>;

export type CronPOLike = InferSelectModel<typeof cronTable>;
type CronSelectPOLike = InferInsertModel<typeof cronTable>;
type CronAddPOLike = Omit<
  CronPOLike,
  | IndexKeyLike
  | AuditAddOmitKeyLike
  | "runCount"
  | "lastRunTimeUtc"
  | "nextRunTimeUtc"
>;
type CronUpdatePOLike = Partial<
  Omit<CronSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<CronPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const CronBaseVO = CronBasePO;

export const CronVO = {
  ...IndexVO,
  ...CronBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof CronVOLike, JSONSchema>>;

export const CronListVO = CronVO;
export const CronAddVO = {
  jobKey: CronBasePO.jobKey,
  name: CronBasePO.name,
  cronExpression: CronBasePO.cronExpression,
  status: CronBasePO.status,
  parameters: CronBasePO.parameters,
} as const satisfies Partial<Record<keyof CronVOLike, JSONSchema>>;

export const CronUpdateVO = {
  ...IndexVO,
  ...CronAddVO,
} as const satisfies Partial<Record<keyof CronVOLike, JSONSchema>>;

export type CronVOLike = CronPOLike;
export type CronAddVOLike = Omit<CronAddPOLike, "creatorId">;
export type CronUpdateVOLike = CronUpdatePOLike;
export type CronDeleteVOLike = Pick<CronVOLike, IndexKeyLike>;
export type CronGetVOLike = Pick<CronVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const CronAddKeys = [
  "jobKey",
  "name",
  "cronExpression",
  "status",
] as const satisfies RequiredKeys<CronAddVOLike>[];

export const CronUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<CronUpdateVOLike>[];

export const CronDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<CronDeleteVOLike>[];

export const CronGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<CronGetVOLike>[];

const CronBaseKeys = [
  ...IndexKey,
  "jobKey",
  "name",
  "cronExpression",
  "status",
  "runCount",
  ...AuditKeys,
] as const satisfies RequiredKeys<CronPOLike>[];

export const CronListKeys = CronBaseKeys;
export const CronDetailKeys = CronBaseKeys;

export const CronSortableKeys = [
  "id",
  "name",
  "lastRunTimeUtc",
  "runCount",
  "createTimeUtc",
] as const satisfies RequiredKeys<CronPOLike>[];

//----------------- Drizzle Tables ----------------//

export const cronTable = sqliteTable("system_cron_job", {
  id: integer("id").primaryKey().notNull(),
  jobKey: text("job_key").notNull(),
  name: text("name").notNull(),
  cronExpression: text("cron_expression").notNull(),
  status: integer("status").$type<0 | 1>().notNull().default(1),
  parameters: text("parameters"),
  lastRunTimeUtc: integer("last_run_time_utc"),
  nextRunTimeUtc: integer("next_run_time_utc"),
  runCount: integer("run_count").notNull().default(0),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export const cronLogTable = sqliteTable("system_cron_job_log", {
  id: integer("id").primaryKey().notNull(),
  jobId: integer("job_id").notNull(),
  status: integer("status").notNull(), // 0: 失败, 1: 成功
  errorMessage: text("error_message"),
  responseBody: text("response_body"),
  startTimeUtc: integer("start_time_utc").notNull(),
  endTimeUtc: integer("end_time_utc").notNull(),
  durationMs: integer("duration_ms").notNull(),
});

export default cronTable;
