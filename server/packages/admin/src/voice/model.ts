import type { JSONSchema } from "json-schema-to-ts";
import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";

/**
 * 通话会话日志表
 * 记录每次 App-to-App 实时通话会话的生命周期
 */
export const voiceSessionLogTable = sqliteTable(
  "admin_voice_session_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    meetingId: text("meeting_id").notNull(),
    meetingTitle: text("meeting_title"),
    status: text("status").notNull(),
    taskId: text("task_id").notNull(),
    creatorId: integer("creator_id").notNull(),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
    endTimeUtc: integer("end_time_utc"),
  },
  (table) => [
    index("idx_voice_meeting_id").on(table.meetingId),
    index("idx_voice_creator_status").on(table.creatorId, table.status),
  ]
);

// ─── Config Types & Schemas ──────────────────────────────────────────────────

/**
 * 实时通话服务配置 (存储于 base_sys_config, namespace: 'voice')
 */
export interface VoiceConfigOptions {
  /** Cloudflare 账户 ID */
  cfAccountId?: string;
  /** RealtimeKit App ID */
  rtkAppId?: string;
  /** RealtimeKit API Token (需拥有 Realtime API Edit 权限) */
  rtkApiToken?: string;
}

export const VoiceConfigOptionsSchema = {
  type: "object",
  properties: {
    cfAccountId: { type: "string" },
    rtkAppId: { type: "string" },
    rtkApiToken: { type: "string" },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

// ─── Request / Response VO Properties ────────────────────────────────────────

/**
 * 创建通话会话请求属性定义
 */
export const VoiceMeetingCreateVO = {
  title: {
    type: "string",
    nullable: true,
    description: "会话标题（可选）",
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * 加入通话会话请求属性定义
 */
export const VoiceJoinVO = {
  meetingId: {
    type: "string",
    description: "会话 ID（由创建会话接口返回）",
  },
  displayName: {
    type: "string",
    nullable: true,
    description: "显示名称（可选，默认取当前登录用户名）",
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * 结束通话会话请求属性定义
 */
export const VoiceEndVO = {
  meetingId: {
    type: "string",
    description: "会话 ID",
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * 通话日志列表查询请求属性定义
 */
export const VoiceSessionListVO = {
  page: { type: "number", description: "页码，从 1 开始" },
  pageSize: { type: "number", description: "每页条数" },
  status: {
    type: "string",
    nullable: true,
    enum: ["active", "ended"],
    description: "会话状态过滤",
  },
} as const satisfies Record<string, JSONSchema>;

// ─── Request Schemas ──────────────────────────────────────────────────────────

/**
 * 创建通话会话 API 请求 Schema
 */
export const VoiceMeetingCreateReqSchema = {
  type: "object",
  properties: VoiceMeetingCreateVO,
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * 创建通话会话 API 响应 Schema
 */
export const VoiceMeetingCreateResSchema = {
  type: "object",
  properties: {
    meetingId: { type: "string", description: "RealtimeKit 会话 ID" },
    taskId: { type: "string", description: "内部异步任务 ID" },
    status: { type: "string", description: "任务状态" },
  },
  required: ["meetingId", "taskId", "status"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * 加入通话会话 API 请求 Schema
 */
export const VoiceJoinReqSchema = {
  type: "object",
  properties: VoiceJoinVO,
  required: ["meetingId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * 加入通话会话 API 响应 Schema
 */
export const VoiceJoinResSchema = {
  type: "object",
  properties: {
    authToken: {
      type: "string",
      description: "RealtimeKit 参与者 authToken，用于前端 SDK 初始化",
    },
    meetingId: { type: "string", description: "会话 ID" },
  },
  required: ["authToken", "meetingId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * 结束通话会话 API 请求 Schema
 */
export const VoiceEndReqSchema = {
  type: "object",
  properties: VoiceEndVO,
  required: ["meetingId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * 结束通话会话 API 响应 Schema
 */
export const VoiceEndResSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * 通话日志列表查询 API 请求 Schema
 */
export const VoiceSessionListReqSchema = {
  type: "object",
  properties: VoiceSessionListVO,
  required: ["page", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * 通话日志列表查询 API 响应 Schema
 */
export const VoiceSessionListResSchema = {
  type: "object",
  properties: {
    list: {
      type: "array",
      items: { type: "object", additionalProperties: true },
      description: "会话日志列表",
    },
    total: { type: "number", description: "总条数" },
    page: { type: "number", description: "当前页码" },
    pageSize: { type: "number", description: "每页条数" },
  },
  required: ["list", "total", "page", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;
