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
export const baseConfigTable = sqliteTable(
  "base_config",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id"),
    namespace: text("namespace").notNull(),
    configKey: text("config_key").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" })
      .notNull()
      .default(true),
    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
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
    namespaceIdx: index("idx_base_config_namespace").on(table.namespace),
    tenantIdx: index("idx_base_config_tenant").on(table.tenantId),
  })
);

export default baseConfigTable;

//----------------- PO / VO ----------------//
const BaseConfigBasePO = {
  tenantId: {
    type: ["number", "null"],
    nullable: true,
    description: "租户ID",
  },
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
} as const satisfies Partial<Record<keyof BaseConfigPOLike, JSONSchema>>;

export const BaseConfigPO = {
  ...IndexPO,
  ...BaseConfigBasePO,
  ...AuditPO,
} as const satisfies Record<keyof BaseConfigPOLike, JSONSchema>;

export type BaseConfigPOLike = InferSelectModel<typeof baseConfigTable>;
export type BaseConfigInsertPOLike = InferInsertModel<typeof baseConfigTable>;
export type BaseConfigAddPOLike = Omit<
  BaseConfigPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
export type BaseConfigUpdatePOLike = Partial<
  Omit<BaseConfigInsertPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<BaseConfigPOLike, IndexKeyLike>;

export { IndexVO };
export const BaseConfigVO = {
  ...IndexVO,
  ...BaseConfigBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof BaseConfigVOLike, JSONSchema>>;

export const BaseConfigListVO = BaseConfigVO;
export const BaseConfigAddVO = BaseConfigBasePO;
export const BaseConfigUpdateVO = {
  ...IndexVO,
  ...BaseConfigBasePO,
} as const satisfies Partial<Record<keyof BaseConfigVOLike, JSONSchema>>;

export type BaseConfigVOLike = BaseConfigPOLike;
export type BaseConfigAddVOLike = Omit<BaseConfigAddPOLike, "creatorId">;
export type BaseConfigUpdateVOLike = BaseConfigUpdatePOLike;
export type BaseConfigDeleteVOLike = Pick<BaseConfigVOLike, IndexKeyLike>;
export type BaseConfigGetVOLike = Pick<BaseConfigVOLike, IndexKeyLike>;

export const BaseConfigAddKeys = [
  "namespace",
  "configKey",
  "isEnabled",
  "isPrimary",
  "configValue",
] as const satisfies RequiredKeys<BaseConfigAddVOLike>[];

export const BaseConfigUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseConfigUpdateVOLike>[];

export const BaseConfigDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseConfigDeleteVOLike>[];

export const BaseConfigGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseConfigGetVOLike>[];

const BaseConfigBaseKeys = [
  ...IndexKey,
  ...BaseConfigAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<BaseConfigPOLike>[];

export const BaseConfigListKeys = BaseConfigBaseKeys;
export const BaseConfigDetailKeys = BaseConfigBaseKeys;

export const BaseConfigSortableKeys = [
  "id",
  "namespace",
  "isEnabled",
  "isPrimary",
  "createTimeUtc",
] as const satisfies RequiredKeys<BaseConfigPOLike>[];

export const NamespacesResVO = {
  namespace: { type: "string", description: "命名空间" },
} as const satisfies Record<string, JSONSchema>;

export const NamespacesResKeys = ["namespace"] as const;
