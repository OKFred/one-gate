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

//----------------- PO ----------------//
const ApiTokenUniquePO = {
  tokenHash: {
    type: "string",
    description: "令牌哈希值（SHA-256），用于鉴权比对",
    maxLength: 64,
  },
} as const satisfies Partial<Record<keyof ApiTokenPOLike, JSONSchema>>;

const ApiTokenBasePO = {
  name: {
    type: "string",
    description: "令牌名称（描述性）",
    examples: ["CI/CD 部署令牌", "监控系统只读令牌"],
    maxLength: 200,
  },
  tokenPrefix: {
    type: "string",
    description: "令牌前缀（前 12 字符），用于列表展示标识",
    maxLength: 20,
  },
  permissions: {
    type: "string",
    description:
      '权限 code 列表（JSON 数组字符串），如 ["admin.system.user:read","admin.mail.account:edit"]',
    examples: ['["admin.system.user:read"]'],
  },
  ipWhitelist: {
    type: ["string", "null"],
    nullable: true,
    description:
      '允许的 IP 列表（JSON 数组字符串），如 ["192.168.1.0/24"]，null 表示不限制',
    examples: ['["192.168.1.0/24"]'],
  },
  startTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "生效时间（毫秒时间戳），null 表示立即生效",
    examples: [1672531199000],
  },
  expireTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "过期时间（毫秒时间戳），null 表示永不过期",
    examples: [1704067199000],
  },
  lastUsedTimeUtc: {
    type: ["number", "null"],
    nullable: true,
    description: "上次使用时间（毫秒时间戳）",
    examples: [1672531199000],
  },
  status: {
    type: "string",
    enum: ["active", "revoked"],
    description: "令牌状态：active-活跃 / revoked-已吊销",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注说明",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof ApiTokenPOLike, JSONSchema>>;

const ApiTokenPO = {
  ...IndexPO,
  ...ApiTokenUniquePO,
  ...ApiTokenBasePO,
  ...AuditPO,
} as const satisfies Record<keyof ApiTokenPOLike, JSONSchema>;

export type ApiTokenPOLike = InferSelectModel<typeof apiTokenTable>;
type ApiTokenInsertPOLike = InferInsertModel<typeof apiTokenTable>;
type ApiTokenAddPOLike = Omit<
  ApiTokenPOLike,
  IndexKeyLike | AuditAddOmitKeyLike | "lastUsedTimeUtc"
>;
type ApiTokenUpdatePOLike = Partial<
  Omit<ApiTokenInsertPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<ApiTokenPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const ApiTokenBaseVO = ApiTokenBasePO;
export const ApiTokenVO = {
  ...IndexVO,
  ...ApiTokenBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof ApiTokenVOLike, JSONSchema>>;

/** 列表 VO（不包含 tokenHash） */
export const ApiTokenListVO = ApiTokenVO;

/** 新增请求 VO（不包含 tokenHash/tokenPrefix/lastUsedTimeUtc/status，由服务端生成） */
export const ApiTokenAddVO = {
  name: ApiTokenBasePO.name,
  permissions: ApiTokenBasePO.permissions,
  ipWhitelist: ApiTokenBasePO.ipWhitelist,
  startTimeUtc: ApiTokenBasePO.startTimeUtc,
  expireTimeUtc: ApiTokenBasePO.expireTimeUtc,
  remark: ApiTokenBasePO.remark,
} as const satisfies Partial<Record<keyof ApiTokenAddVOLike, JSONSchema>>;

/** 更新请求 VO */
export const ApiTokenUpdateVO = {
  ...IndexVO,
  name: ApiTokenBasePO.name,
  permissions: ApiTokenBasePO.permissions,
  ipWhitelist: ApiTokenBasePO.ipWhitelist,
  startTimeUtc: ApiTokenBasePO.startTimeUtc,
  expireTimeUtc: ApiTokenBasePO.expireTimeUtc,
  remark: ApiTokenBasePO.remark,
} as const satisfies Partial<Record<keyof ApiTokenUpdateVOLike, JSONSchema>>;

export type ApiTokenVOLike = Omit<ApiTokenPOLike, "tokenHash">;
export type ApiTokenAddVOLike = Omit<
  ApiTokenAddPOLike,
  "creatorId" | "tokenHash" | "tokenPrefix" | "status"
>;
export type ApiTokenUpdateVOLike = Pick<ApiTokenPOLike, IndexKeyLike> &
  Partial<ApiTokenAddVOLike>;
export type ApiTokenDeleteVOLike = Pick<ApiTokenPOLike, IndexKeyLike>;
export type ApiTokenGetVOLike = Pick<ApiTokenPOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const ApiTokenAddKeys = [
  "name",
  "permissions",
] as const satisfies RequiredKeys<ApiTokenAddVOLike>[];
export const ApiTokenUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ApiTokenUpdateVOLike>[];
export const ApiTokenDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ApiTokenDeleteVOLike>[];
export const ApiTokenGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<ApiTokenGetVOLike>[];
const ApiTokenBaseKeys = [
  ...IndexKey,
  "name",
  "tokenPrefix",
  "permissions",
  "ipWhitelist",
  "startTimeUtc",
  "expireTimeUtc",
  "lastUsedTimeUtc",
  "status",
  "remark",
  ...AuditKeys,
] as const satisfies RequiredKeys<ApiTokenVOLike>[];
export const ApiTokenListKeys = ApiTokenBaseKeys;
export const ApiTokenDetailKeys = ApiTokenBaseKeys;

/** 可排序字段 */
export const ApiTokenSortableKeys = [
  "id",
  "name",
  "status",
  "lastUsedTimeUtc",
  "expireTimeUtc",
  "createTimeUtc",
] as const satisfies RequiredKeys<ApiTokenPOLike>[];

export const apiTokenTable = sqliteTable("system_api_token", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  tokenPrefix: text("token_prefix").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  permissions: text("permissions").notNull(),
  ipWhitelist: text("ip_whitelist"),
  startTimeUtc: integer("start_time_utc"),
  expireTimeUtc: integer("expire_time_utc"),
  lastUsedTimeUtc: integer("last_used_time_utc"),
  status: text("status").notNull(),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default apiTokenTable;
