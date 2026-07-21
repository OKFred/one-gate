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
export const baseSysConfigTable = sqliteTable(
  "base_sys_config",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    namespaceIdx: index("idx_base_sys_config_namespace").on(table.namespace),
  })
);

export default baseSysConfigTable;

//----------------- PO / VO ----------------//
const BaseSysConfigBasePO = {
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
} as const satisfies Partial<Record<keyof BaseSysConfigPOLike, JSONSchema>>;

export const BaseSysConfigPO = {
  ...IndexPO,
  ...BaseSysConfigBasePO,
  ...AuditPO,
} as const satisfies Record<keyof BaseSysConfigPOLike, JSONSchema>;

export type BaseSysConfigPOLike = InferSelectModel<typeof baseSysConfigTable>;
export type BaseSysConfigInsertPOLike = InferInsertModel<
  typeof baseSysConfigTable
>;
export type BaseSysConfigAddPOLike = Omit<
  BaseSysConfigPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
export type BaseSysConfigUpdatePOLike = Partial<
  Omit<BaseSysConfigInsertPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<BaseSysConfigPOLike, IndexKeyLike>;

export { IndexVO };
export const BaseSysConfigVO = {
  ...IndexVO,
  ...BaseSysConfigBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof BaseSysConfigVOLike, JSONSchema>>;

export const BaseSysConfigListVO = BaseSysConfigVO;
export const BaseSysConfigAddVO = BaseSysConfigBasePO;
export const BaseSysConfigUpdateVO = {
  ...IndexVO,
  ...BaseSysConfigBasePO,
} as const satisfies Partial<Record<keyof BaseSysConfigVOLike, JSONSchema>>;

export type BaseSysConfigVOLike = BaseSysConfigPOLike;
export type BaseSysConfigAddVOLike = Omit<BaseSysConfigAddPOLike, "creatorId">;
export type BaseSysConfigUpdateVOLike = BaseSysConfigUpdatePOLike;
export type BaseSysConfigDeleteVOLike = Pick<BaseSysConfigVOLike, IndexKeyLike>;
export type BaseSysConfigGetVOLike = Pick<BaseSysConfigVOLike, IndexKeyLike>;

export const BaseSysConfigAddKeys = [
  "namespace",
  "configKey",
  "isEnabled",
  "isPrimary",
  "configValue",
] as const satisfies RequiredKeys<BaseSysConfigAddVOLike>[];

export const BaseSysConfigUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseSysConfigUpdateVOLike>[];

export const BaseSysConfigDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseSysConfigDeleteVOLike>[];

export const BaseSysConfigGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseSysConfigGetVOLike>[];

const BaseSysConfigBaseKeys = [
  ...IndexKey,
  ...BaseSysConfigAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<BaseSysConfigPOLike>[];

export const BaseSysConfigListKeys = BaseSysConfigBaseKeys;
export const BaseSysConfigDetailKeys = BaseSysConfigBaseKeys;

export const BaseSysConfigSortableKeys = [
  "id",
  "namespace",
  "isEnabled",
  "isPrimary",
  "createTimeUtc",
] as const satisfies RequiredKeys<BaseSysConfigPOLike>[];

export const NamespacesResVO = {
  namespace: { type: "string", description: "命名空间" },
} as const satisfies Record<string, JSONSchema>;

export const NamespacesResKeys = ["namespace"] as const;
