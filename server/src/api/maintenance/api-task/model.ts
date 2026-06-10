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
const ApiTaskBasePO = {
  taskKey: {
    type: "string",
    description: "任务唯一标识键",
    maxLength: 100,
  },
  name: {
    type: "string",
    description: "任务名称",
    maxLength: 100,
  },
  description: {
    type: ["string", "null"],
    nullable: true,
    description: "任务描述",
    maxLength: 500,
  },
  baseUrl: {
    type: "string",
    description: "请求基础 URL，例如 https://api.example.com",
    maxLength: 500,
  },
  path: {
    type: "string",
    description: "API 路径，例如 /v1/data",
    maxLength: 500,
  },
  method: {
    type: "string",
    description: "HTTP 方法",
    enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
  headers: {
    type: ["string", "null"],
    nullable: true,
    description: "JSON 字符串，默认请求头（如 Authorization）",
  },
  requestSchema: {
    type: ["string", "null"],
    nullable: true,
    description: "OAS3 Schema JSON 字符串，描述请求入参结构",
  },
  responseSchema: {
    type: ["string", "null"],
    nullable: true,
    description: "OAS3 Schema JSON 字符串，描述响应结构（可选，仅供文档参考）",
  },
  timeoutMs: {
    type: "number",
    description: "请求超时时间（毫秒），默认 30000",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
} as const satisfies Partial<Record<keyof ApiTaskPOLike, JSONSchema>>;

export const ApiTaskPO = {
  ...IndexPO,
  ...ApiTaskBasePO,
  ...AuditPO,
} as const satisfies Record<keyof ApiTaskPOLike, JSONSchema>;

export type ApiTaskPOLike = InferSelectModel<typeof apiTaskTable>;
type ApiTaskSelectPOLike = InferInsertModel<typeof apiTaskTable>;
type ApiTaskAddPOLike = Omit<ApiTaskPOLike, IndexKeyLike | AuditAddOmitKeyLike>;
type ApiTaskUpdatePOLike = Partial<
  Omit<ApiTaskSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<ApiTaskPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const ApiTaskBaseVO = ApiTaskBasePO;

export const ApiTaskVO = {
  ...IndexVO,
  ...ApiTaskBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof ApiTaskVOLike, JSONSchema>>;

export const ApiTaskListVO = ApiTaskVO;
export const ApiTaskAddVO = {
  taskKey: ApiTaskBasePO.taskKey,
  name: ApiTaskBasePO.name,
  description: ApiTaskBasePO.description,
  baseUrl: ApiTaskBasePO.baseUrl,
  path: ApiTaskBasePO.path,
  method: ApiTaskBasePO.method,
  headers: ApiTaskBasePO.headers,
  requestSchema: ApiTaskBasePO.requestSchema,
  responseSchema: ApiTaskBasePO.responseSchema,
  timeoutMs: ApiTaskBasePO.timeoutMs,
  isEnabled: ApiTaskBasePO.isEnabled,
} as const satisfies Partial<Record<keyof ApiTaskVOLike, JSONSchema>>;

export const ApiTaskUpdateVO = {
  ...IndexVO,
  ...ApiTaskAddVO,
} as const satisfies Partial<Record<keyof ApiTaskVOLike, JSONSchema>>;

export type ApiTaskVOLike = ApiTaskPOLike;
export type ApiTaskAddVOLike = Omit<ApiTaskAddPOLike, "creatorId">;
export type ApiTaskUpdateVOLike = ApiTaskUpdatePOLike;
export type ApiTaskDeleteVOLike = Pick<ApiTaskVOLike, IndexKeyLike>;
export type ApiTaskGetVOLike = Pick<ApiTaskVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const ApiTaskAddKeys = [
  "taskKey",
  "name",
  "baseUrl",
  "path",
  "method",
  "timeoutMs",
  "isEnabled",
] as const satisfies RequiredKeys<ApiTaskAddVOLike>[];

export const ApiTaskUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ApiTaskUpdateVOLike>[];

export const ApiTaskDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ApiTaskDeleteVOLike>[];

export const ApiTaskGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ApiTaskGetVOLike>[];

const ApiTaskBaseKeys = [
  ...IndexKey,
  "taskKey",
  "name",
  "description",
  "baseUrl",
  "path",
  "method",
  "headers",
  "requestSchema",
  "responseSchema",
  "timeoutMs",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<ApiTaskPOLike>[];

export const ApiTaskListKeys = ApiTaskBaseKeys;
export const ApiTaskDetailKeys = ApiTaskBaseKeys;

export const ApiTaskSortableKeys = [
  "id",
  "name",
  "taskKey",
  "createTimeUtc",
] as const satisfies RequiredKeys<ApiTaskPOLike>[];

//----------------- Drizzle Tables ----------------//

export const apiTaskTable = sqliteTable("maintenance_api_task", {
  id: integer("id").primaryKey().notNull(),
  taskKey: text("task_key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  baseUrl: text("base_url").notNull(),
  path: text("path").notNull(),
  method: text("method")
    .$type<"GET" | "POST" | "PUT" | "PATCH" | "DELETE">()
    .notNull()
    .default("GET"),
  headers: text("headers"),
  requestSchema: text("request_schema"),
  responseSchema: text("response_schema"),
  timeoutMs: integer("timeout_ms").notNull().default(30000),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default apiTaskTable;
