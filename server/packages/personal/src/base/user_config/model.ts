import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import { type JSONSchema } from "json-schema-to-ts";
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

//----------------- Base Interface ----------------//
export interface IDomainConfigProvider {
  getNamespace(): string;
  getJsonSchema(): Record<string, JSONSchema>;
  getDefaultValues(): Record<string, unknown>;
  onConfigChanged?(oldVal: unknown, newVal: unknown): void;
}

//----------------- Table ----------------//
export const baseUserConfigTable = sqliteTable(
  "base_user_config",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    namespace: text("namespace").notNull(),
    configKey: text("config_key").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull(),
    configValue: text("config_value", { mode: "json" }).notNull(),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => ({
    tenantNamespaceIdx: index("idx_base_user_config_tenant_namespace").on(
      table.userId,
      table.namespace
    ),
  })
);

export default baseUserConfigTable;

//----------------- PO / VO ----------------//
const BaseUserConfigBasePO = {
  namespace: {
    type: "string",
    description: "命名空间",
  },
  configKey: {
    type: "string",
    description: "配置键",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  isPrimary: {
    type: "boolean",
    description: "是否为主配置",
  },
  configValue: {
    type: "object",
    additionalProperties: true,
    description: "配置值JSON",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
  },
} as const satisfies Partial<Record<keyof BaseUserConfigPOLike, JSONSchema>>;

export const BaseUserConfigPO = {
  ...IndexPO,
  userId: {
    type: "integer",
    description: "用户ID",
  },
  ...BaseUserConfigBasePO,
  ...AuditPO,
} as const satisfies Record<keyof BaseUserConfigPOLike, JSONSchema>;

export type BaseUserConfigPOLike = InferSelectModel<typeof baseUserConfigTable>;
export type BaseUserConfigInsertPOLike = InferInsertModel<
  typeof baseUserConfigTable
>;
export type BaseUserConfigAddPOLike = Omit<
  BaseUserConfigPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
export type BaseUserConfigUpdatePOLike = Partial<
  Omit<BaseUserConfigInsertPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<BaseUserConfigPOLike, IndexKeyLike>;

export { IndexVO };
export const BaseUserConfigVO = {
  ...IndexVO,
  userId: {
    type: "integer",
    description: "用户ID",
  },
  ...BaseUserConfigBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof BaseUserConfigVOLike, JSONSchema>>;

export const BaseUserConfigListVO = BaseUserConfigVO;
export const BaseUserConfigAddVO = BaseUserConfigBasePO;
export const BaseUserConfigUpdateVO = {
  ...IndexVO,
  userId: {
    type: "integer",
    description: "用户ID",
  },
  ...BaseUserConfigBasePO,
} as const satisfies Partial<Record<keyof BaseUserConfigVOLike, JSONSchema>>;

export type BaseUserConfigVOLike = BaseUserConfigPOLike;
export type BaseUserConfigAddVOLike = Omit<
  BaseUserConfigAddPOLike,
  "creatorId" | "userId"
>;
export type BaseUserConfigUpdateVOLike = BaseUserConfigUpdatePOLike;
export type BaseUserConfigDeleteVOLike = Pick<
  BaseUserConfigVOLike,
  IndexKeyLike
>;
export type BaseUserConfigGetVOLike = Pick<BaseUserConfigVOLike, IndexKeyLike>;

export const BaseUserConfigAddKeys = [
  "namespace",
  "configKey",
  "isEnabled",
  "isPrimary",
  "configValue",
] as const satisfies RequiredKeys<BaseUserConfigAddVOLike>[];

export const BaseUserConfigUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseUserConfigUpdateVOLike>[];

export const BaseUserConfigDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseUserConfigDeleteVOLike>[];

export const BaseUserConfigGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseUserConfigGetVOLike>[];

const BaseUserConfigBaseKeys = [
  ...IndexKey,
  ...BaseUserConfigAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<BaseUserConfigPOLike>[];

export const BaseUserConfigListKeys = BaseUserConfigBaseKeys;
export const BaseUserConfigDetailKeys = BaseUserConfigBaseKeys;

export const BaseUserConfigSortableKeys = [
  "id",
  "namespace",
  "isEnabled",
  "isPrimary",
  "createTimeUtc",
] as const satisfies RequiredKeys<BaseUserConfigPOLike>[];

export const NamespacesResVO = {
  namespace: { type: "string", description: "命名空间" },
} as const satisfies Record<string, JSONSchema>;

export const NamespacesResKeys = ["namespace"] as const;
