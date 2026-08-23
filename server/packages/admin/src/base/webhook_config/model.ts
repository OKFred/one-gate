import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import {
  AuditKeys,
  AuditPO,
  AuditVO,
  IndexKey,
  IndexPO,
  IndexVO,
  type AuditAddOmitKeyLike,
  type AuditUpdateOmitKeyLike,
  type IndexKeyLike,
} from "@hodor/core/db/common/schema";
import type { RequiredKeys } from "@hodor/core/types/app";

export const webhookConfigTable = sqliteTable(
  "base_webhook_config",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull(),
    url: text("url").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull(),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => ({
    sourceIdx: index("idx_base_webhook_config_source").on(table.source),
  })
);

export default webhookConfigTable;

const WebhookConfigBasePO = {
  source: {
    type: "string",
    description: "Webhook 来源，例如 feishu",
    minLength: 1,
    maxLength: 50,
    pattern: "^[A-Za-z][A-Za-z0-9_-]*$",
  },
  url: {
    type: "string",
    description: "Webhook HTTPS URL",
    minLength: 1,
    maxLength: 1500,
    format: "uri",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  isPrimary: {
    type: "boolean",
    description: "是否为当前来源的主配置",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof WebhookConfigPOLike, JSONSchema>>;

export const WebhookConfigPO = {
  ...IndexPO,
  ...WebhookConfigBasePO,
  ...AuditPO,
} as const satisfies Record<keyof WebhookConfigPOLike, JSONSchema>;

export type WebhookConfigPOLike = InferSelectModel<typeof webhookConfigTable>;
export type WebhookConfigInsertPOLike = InferInsertModel<
  typeof webhookConfigTable
>;
type WebhookConfigAddPOLike = Omit<
  WebhookConfigPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type WebhookConfigUpdatePOLike = Partial<
  Omit<WebhookConfigInsertPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<WebhookConfigPOLike, IndexKeyLike>;

export { IndexVO };
export const WebhookConfigVO = {
  ...IndexVO,
  ...WebhookConfigBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof WebhookConfigVOLike, JSONSchema>>;
export const WebhookConfigAddVO = WebhookConfigBasePO;
export const WebhookConfigUpdateVO = {
  ...IndexVO,
  ...WebhookConfigBasePO,
} as const satisfies Partial<
  Record<keyof WebhookConfigUpdateVOLike, JSONSchema>
>;

export type WebhookConfigVOLike = WebhookConfigPOLike;
export type WebhookConfigAddVOLike = Omit<WebhookConfigAddPOLike, "creatorId">;
export type WebhookConfigUpdateVOLike = WebhookConfigUpdatePOLike;

export const WebhookConfigAddKeys = [
  "source",
  "url",
  "isEnabled",
  "isPrimary",
] as const satisfies RequiredKeys<WebhookConfigAddVOLike>[];
export const WebhookConfigUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<WebhookConfigUpdateVOLike>[];
export const WebhookConfigGetKeys = [...IndexKey] as const;
export const WebhookConfigListKeys = [
  ...IndexKey,
  "source",
  "url",
  "isEnabled",
  "isPrimary",
  "remark",
  ...AuditKeys,
] as const satisfies RequiredKeys<WebhookConfigPOLike>[];
export const WebhookConfigDetailKeys = WebhookConfigListKeys;
export const WebhookConfigSortableKeys = [
  "id",
  "source",
  "isEnabled",
  "isPrimary",
  "createTimeUtc",
] as const satisfies RequiredKeys<WebhookConfigPOLike>[];
