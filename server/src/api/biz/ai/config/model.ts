import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { type JSONSchema } from "json-schema-to-ts";
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
const AiLlmConfigBasePO = {
  name: {
    type: "string",
    description: "配置名称",
    examples: ["My DeepSeek"],
  },
  provider: {
    type: "string",
    description: "提供商类型 (OpenAI, DeepSeek, Ollama 等)",
  },
  baseUrl: {
    type: ["string", "null"],
    nullable: true,
    description: "API 基础地址",
    examples: ["https://api.deepseek.com/v1"],
  },
  apiKey: {
    type: "string",
    description: "API 密钥",
  },
  model: {
    type: "string",
    description: "模型名称",
    examples: ["deepseek-chat"],
  },
  capabilities: {
    type: ["string", "null"],
    nullable: true,
    description: "模型支持的能力 (JSON 数组，如 ['text', 'image'])",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  isDefault: {
    type: "boolean",
    description: "是否为默认配置",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof AiLlmConfigPOLike, JSONSchema>>;

export const AiLlmConfigPO = {
  ...IndexPO,
  ...AiLlmConfigBasePO,
  ...AuditPO,
} as const satisfies Record<keyof AiLlmConfigPOLike, JSONSchema>;

export type AiLlmConfigPOLike = InferSelectModel<typeof aiLlmConfigTable>;
type AiLlmConfigInsertPOLike = InferInsertModel<typeof aiLlmConfigTable>;
type AiLlmConfigAddPOLike = Omit<
  AiLlmConfigPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type AiLlmConfigUpdatePOLike = Partial<
  Omit<AiLlmConfigInsertPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<AiLlmConfigPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const AiLlmConfigVO = {
  ...IndexVO,
  ...AiLlmConfigBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof AiLlmConfigVOLike, JSONSchema>>;

export const AiLlmConfigListVO = AiLlmConfigVO;
export const AiLlmConfigAddVO = AiLlmConfigBasePO;
export const AiLlmConfigUpdateVO = {
  ...IndexVO,
  ...AiLlmConfigBasePO,
} as const satisfies Partial<Record<keyof AiLlmConfigVOLike, JSONSchema>>;

export type AiLlmConfigVOLike = AiLlmConfigPOLike;
export type AiLlmConfigAddVOLike = Omit<AiLlmConfigAddPOLike, "creatorId">;
export type AiLlmConfigUpdateVOLike = AiLlmConfigUpdatePOLike;
export type AiLlmConfigDeleteVOLike = Pick<AiLlmConfigVOLike, IndexKeyLike>;
export type AiLlmConfigGetVOLike = Pick<AiLlmConfigVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const AiLlmConfigAddKeys = [
  "name",
  "provider",
  "apiKey",
  "model",
  "isEnabled",
  "isDefault",
] as const satisfies RequiredKeys<AiLlmConfigAddVOLike>[];

export const AiLlmConfigUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<AiLlmConfigUpdateVOLike>[];

export const AiLlmConfigDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<AiLlmConfigDeleteVOLike>[];

export const AiLlmConfigGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<AiLlmConfigGetVOLike>[];

const AiLlmConfigBaseKeys = [
  ...IndexKey,
  ...AiLlmConfigAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<AiLlmConfigPOLike>[];

export const AiLlmConfigListKeys = AiLlmConfigBaseKeys;
export const AiLlmConfigDetailKeys = AiLlmConfigBaseKeys;

// 可排序字段
export const AiLlmConfigSortableKeys = [
  "id",
  "name",
  "isEnabled",
  "isDefault",
  "createTimeUtc",
] as const satisfies RequiredKeys<AiLlmConfigPOLike>[];

//----------------- Table ----------------//
export const aiLlmConfigTable = sqliteTable("ai_llm_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  baseUrl: text("base_url"),
  apiKey: text("api_key").notNull(),
  model: text("model").notNull(),
  capabilities: text("capabilities"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull(),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default aiLlmConfigTable;
