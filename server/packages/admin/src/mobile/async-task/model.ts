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

export const MOBILE_TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;
export type MobileTaskPriority = (typeof MOBILE_TASK_PRIORITIES)[number];

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
    description: "兼容字段；v2 任务仅保存 scriptId，不保存脚本源码",
  },
  protocolVersion: {
    type: ["integer", "null"],
    nullable: true,
    description: "设备任务协议版本",
  },
  scriptId: {
    type: ["string", "null"],
    nullable: true,
    description: "手机端可信脚本标识",
    maxLength: 100,
  },
  scriptVersion: {
    type: ["integer", "null"],
    nullable: true,
    description: "手机端可信脚本版本",
  },
  paramsJson: {
    type: ["string", "null"],
    nullable: true,
    description: "结构化任务参数 JSON",
  },
  timeoutMs: {
    type: ["integer", "null"],
    nullable: true,
    description: "设备执行超时时间（毫秒）",
  },
  traceId: {
    type: ["string", "null"],
    nullable: true,
    description: "任务链路追踪标识",
    maxLength: 100,
  },
  priority: {
    type: "string",
    enum: MOBILE_TASK_PRIORITIES,
    description: "手机端队列调度优先级",
  },
  preemptRunning: {
    type: "boolean",
    description: "是否显式抢占不高于当前优先级的运行任务",
  },
  preemptedByTaskId: {
    type: ["string", "null"],
    nullable: true,
    description: "抢占当前任务的任务标识",
    maxLength: 100,
  },
  status: {
    type: "string",
    description: "任务状态",
    enum: [
      "PENDING",
      "RUNNING",
      "SUCCESS",
      "FAILURE",
      "TIMEOUT",
      "REJECTED",
      "CANCELLED",
    ],
  },
  resultMessage: {
    type: ["string", "null"],
    nullable: true,
    description: "执行结果或失败原因",
  },
  resultCode: {
    type: ["string", "null"],
    nullable: true,
    description: "统一结果码",
    maxLength: 100,
  },
  resultDataJson: {
    type: ["string", "null"],
    nullable: true,
    description: "结构化执行结果 JSON",
  },
  startedAtUtc: {
    type: ["integer", "null"],
    nullable: true,
    description: "设备开始执行时间",
  },
  finishedAtUtc: {
    type: ["integer", "null"],
    nullable: true,
    description: "设备完成执行时间",
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
  protocolVersion: MobileAsyncTaskBasePO.protocolVersion,
  scriptId: MobileAsyncTaskBasePO.scriptId,
  scriptVersion: MobileAsyncTaskBasePO.scriptVersion,
  paramsJson: MobileAsyncTaskBasePO.paramsJson,
  timeoutMs: MobileAsyncTaskBasePO.timeoutMs,
  traceId: MobileAsyncTaskBasePO.traceId,
  priority: MobileAsyncTaskBasePO.priority,
  preemptRunning: MobileAsyncTaskBasePO.preemptRunning,
  preemptedByTaskId: MobileAsyncTaskBasePO.preemptedByTaskId,
  status: MobileAsyncTaskBasePO.status,
  resultMessage: MobileAsyncTaskBasePO.resultMessage,
  resultCode: MobileAsyncTaskBasePO.resultCode,
  resultDataJson: MobileAsyncTaskBasePO.resultDataJson,
  startedAtUtc: MobileAsyncTaskBasePO.startedAtUtc,
  finishedAtUtc: MobileAsyncTaskBasePO.finishedAtUtc,
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
  "priority",
  "preemptRunning",
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
  "protocolVersion",
  "scriptId",
  "scriptVersion",
  "paramsJson",
  "timeoutMs",
  "traceId",
  "priority",
  "preemptRunning",
  "preemptedByTaskId",
  "status",
  "resultMessage",
  "resultCode",
  "resultDataJson",
  "startedAtUtc",
  "finishedAtUtc",
  "expiresAtUtc",
  "remark",
  ...AuditKeys,
] as const satisfies RequiredKeys<MobileAsyncTaskPOLike>[];

export const MobileAsyncTaskListKeys = MobileAsyncTaskBaseKeys;
export const MobileAsyncTaskDetailKeys = MobileAsyncTaskBaseKeys;

export const MobileAsyncTaskSortableKeys = [
  "id",
  "taskId",
  "clientId",
  "status",
  "priority",
  "expiresAtUtc",
  "createTimeUtc",
] as const satisfies RequiredKeys<MobileAsyncTaskPOLike>[];

/** 服务端与手机客户端共同支持的可信脚本标识。 */
export const MobileTrustedScriptIds = [
  "device.apps.list",
  "app.install",
  "app.version.check",
  "app.update.store",
  "app.update.zip",
  "file.download",
  "tiktok.post",
  "client.self-update",
  "device.network.switch",
] as const;

/** 可信设备任务下发请求字段。 */
export const MobileAsyncTaskDispatchReqVO = {
  clientId: { type: "string", minLength: 1, maxLength: 100 },
  scriptId: {
    type: "string",
    enum: MobileTrustedScriptIds,
    description: "手机端可信脚本标识",
  },
  params: {
    type: "object",
    additionalProperties: true,
    description: "传递给本地可信脚本的结构化参数",
  },
  timeoutMs: { type: "integer", minimum: 1000, maximum: 900000 },
  priority: {
    type: "string",
    enum: MOBILE_TASK_PRIORITIES,
    description: "可选任务优先级；网络切换默认 HIGH，其余默认 NORMAL",
  },
  preemptRunning: {
    type: "boolean",
    description: "是否抢占同级或更低优先级运行任务；默认 false",
  },
  remark: { type: ["string", "null"], nullable: true, maxLength: 500 },
} as const satisfies Record<string, JSONSchema>;

/** 可信设备任务下发响应字段。 */
export const MobileAsyncTaskDispatchResVO = {
  taskId: { type: "string" },
  status: { type: "string", enum: ["PENDING"] },
  traceId: { type: "string" },
  expiresAtUtc: { type: "integer" },
} as const satisfies Record<string, JSONSchema>;

/** 手机 v2 任务结果回调请求字段。 */
export const MobileAsyncTaskCallbackReqVO = {
  protocolVersion: { type: "integer", enum: [2] },
  taskId: {
    type: "string",
    pattern: "^[A-Za-z0-9_-]{8,100}$",
  },
  deviceId: {
    type: "string",
    pattern: "^[A-Za-z0-9._:-]{1,100}$",
  },
  scriptId: {
    type: "string",
    pattern: "^[a-z0-9._-]{1,100}$",
  },
  status: {
    type: "string",
    enum: ["SUCCESS", "FAILURE", "TIMEOUT", "REJECTED", "CANCELLED"],
  },
  code: { type: "string", minLength: 1, maxLength: 100 },
  message: { type: "string", maxLength: 4000 },
  data: {},
  startedAt: { type: "integer" },
  finishedAt: { type: "integer" },
  durationMs: { type: "integer", minimum: 0 },
  traceId: {
    type: "string",
    pattern: "^[A-Za-z0-9_-]{8,100}$",
  },
} as const satisfies Record<string, JSONSchema>;

//----------------- Drizzle Tables ----------------//
export const mobileAsyncTaskTable = sqliteTable(
  "admin_mobile_async_task",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    taskId: text("task_id").notNull(),
    clientId: text("client_id").notNull(),
    cat: text("cat").notNull(),
    script: text("script").notNull(),
    protocolVersion: integer("protocol_version"),
    scriptId: text("script_id"),
    scriptVersion: integer("script_version"),
    paramsJson: text("params_json"),
    timeoutMs: integer("timeout_ms"),
    traceId: text("trace_id"),
    priority: text("priority").$type<MobileTaskPriority>().notNull(),
    preemptRunning: integer("preempt_running", { mode: "boolean" }).notNull(),
    preemptedByTaskId: text("preempted_by_task_id"),
    status: text("status")
      .$type<
        | "PENDING"
        | "RUNNING"
        | "SUCCESS"
        | "FAILURE"
        | "TIMEOUT"
        | "REJECTED"
        | "CANCELLED"
      >()
      .notNull(),
    resultMessage: text("result_message"),
    resultCode: text("result_code"),
    resultDataJson: text("result_data_json"),
    startedAtUtc: integer("started_at_utc"),
    finishedAtUtc: integer("finished_at_utc"),
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
