import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
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
const MobileAsyncTaskBasePO = {
  taskId: {
    type: "string",
    description: "任务唯一标识 (UUID)",
    maxLength: 100,
  },
  clientId: {
    type: "string",
    description: "设备标识",
    maxLength: 100,
  },
  cat: {
    type: "string",
    description: "任务分类 (shell, autojs6 等)",
    maxLength: 50,
  },
  script: {
    type: "string",
    description: "原始下发的脚本指令",
  },
  status: {
    type: "string",
    description: "任务状态",
    enum: ["PENDING", "SUCCESS", "FAILURE", "TIMEOUT"],
  },
  resultMessage: {
    type: ["string", "null"],
    nullable: true,
    description: "执行结果或失败原因",
  },
  expiresAtUtc: {
    type: "integer",
    description: "任务预期过期时间",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof MobileAsyncTaskPOLike, JSONSchema>>;

export const MobileAsyncTaskPO = {
  ...IndexPO,
  ...MobileAsyncTaskBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MobileAsyncTaskPOLike, JSONSchema>;

export type MobileAsyncTaskPOLike = InferSelectModel<
  typeof mobileAsyncTaskTable
>;
type MobileAsyncTaskSelectPOLike = InferInsertModel<
  typeof mobileAsyncTaskTable
>;
type MobileAsyncTaskAddPOLike = Omit<
  MobileAsyncTaskPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type MobileAsyncTaskUpdatePOLike = Partial<
  Omit<MobileAsyncTaskSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MobileAsyncTaskPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const MobileAsyncTaskBaseVO = MobileAsyncTaskBasePO;

export const MobileAsyncTaskVO = {
  ...IndexVO,
  ...MobileAsyncTaskBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof MobileAsyncTaskVOLike, JSONSchema>>;

export const MobileAsyncTaskListVO = MobileAsyncTaskVO;
export const MobileAsyncTaskAddVO = {
  taskId: MobileAsyncTaskBasePO.taskId,
  clientId: MobileAsyncTaskBasePO.clientId,
  cat: MobileAsyncTaskBasePO.cat,
  script: MobileAsyncTaskBasePO.script,
  status: MobileAsyncTaskBasePO.status,
  resultMessage: MobileAsyncTaskBasePO.resultMessage,
  expiresAtUtc: MobileAsyncTaskBasePO.expiresAtUtc,
  remark: MobileAsyncTaskBasePO.remark,
} as const satisfies Partial<Record<keyof MobileAsyncTaskVOLike, JSONSchema>>;

export const MobileAsyncTaskUpdateVO = {
  ...IndexVO,
  ...MobileAsyncTaskAddVO,
} as const satisfies Partial<Record<keyof MobileAsyncTaskVOLike, JSONSchema>>;

export type MobileAsyncTaskVOLike = MobileAsyncTaskPOLike;
export type MobileAsyncTaskAddVOLike = Omit<
  MobileAsyncTaskAddPOLike,
  "creatorId"
>;
export type MobileAsyncTaskUpdateVOLike = MobileAsyncTaskUpdatePOLike;
export type MobileAsyncTaskDeleteVOLike = Pick<
  MobileAsyncTaskVOLike,
  IndexKeyLike
>;
export type MobileAsyncTaskGetVOLike = Pick<
  MobileAsyncTaskVOLike,
  IndexKeyLike
>;

//----------------- Required Keys ----------------//
export const MobileAsyncTaskAddKeys = [
  "taskId",
  "clientId",
  "cat",
  "script",
  "status",
  "expiresAtUtc",
] as const satisfies RequiredKeys<MobileAsyncTaskAddVOLike>[];

export const MobileAsyncTaskUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileAsyncTaskUpdateVOLike>[];

export const MobileAsyncTaskDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileAsyncTaskDeleteVOLike>[];

export const MobileAsyncTaskGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileAsyncTaskGetVOLike>[];

const MobileAsyncTaskBaseKeys = [
  ...IndexKey,
  "taskId",
  "clientId",
  "cat",
  "script",
  "status",
  "resultMessage",
  "expiresAtUtc",
  ...AuditKeys,
] as const satisfies RequiredKeys<MobileAsyncTaskPOLike>[];

export const MobileAsyncTaskListKeys = MobileAsyncTaskBaseKeys;
export const MobileAsyncTaskDetailKeys = MobileAsyncTaskBaseKeys;

export const MobileAsyncTaskSortableKeys = [
  "id",
  "taskId",
  "clientId",
  "status",
  "expiresAtUtc",
  "createTimeUtc",
] as const satisfies RequiredKeys<MobileAsyncTaskPOLike>[];

//----------------- Drizzle Tables ----------------//
export const mobileAsyncTaskTable = sqliteTable(
  "admin_mobile_async_task",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: text("task_id").notNull(),
    clientId: text("client_id").notNull(),
    cat: text("cat").notNull(),
    script: text("script").notNull(),
    status: text("status")
      .$type<"PENDING" | "SUCCESS" | "FAILURE" | "TIMEOUT">()
      .notNull(),
    resultMessage: text("result_message"),
    expiresAtUtc: integer("expires_at_utc").notNull(),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [uniqueIndex("admin_mobile_async_task_id_unique").on(table.taskId)]
);

export default mobileAsyncTaskTable;
