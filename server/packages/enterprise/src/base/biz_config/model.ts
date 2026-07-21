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
export const baseBizConfigTable = sqliteTable(
  "base_biz_config",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id").notNull(),
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
    tenantNamespaceIdx: index("idx_base_biz_config_tenant_namespace").on(
      table.tenantId,
      table.namespace
    ),
  })
);

export default baseBizConfigTable;

//----------------- PO / VO ----------------//
const BaseBizConfigBasePO = {
  tenantId: {
    type: "string",
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
} as const satisfies Partial<Record<keyof BaseBizConfigPOLike, JSONSchema>>;

export const BaseBizConfigPO = {
  ...IndexPO,
  ...BaseBizConfigBasePO,
  ...AuditPO,
} as const satisfies Record<keyof BaseBizConfigPOLike, JSONSchema>;

export type BaseBizConfigPOLike = InferSelectModel<typeof baseBizConfigTable>;
export type BaseBizConfigInsertPOLike = InferInsertModel<
  typeof baseBizConfigTable
>;
export type BaseBizConfigAddPOLike = Omit<
  BaseBizConfigPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
export type BaseBizConfigUpdatePOLike = Partial<
  Omit<BaseBizConfigInsertPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<BaseBizConfigPOLike, IndexKeyLike>;

export { IndexVO };
export const BaseBizConfigVO = {
  ...IndexVO,
  ...BaseBizConfigBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof BaseBizConfigVOLike, JSONSchema>>;

export const BaseBizConfigListVO = BaseBizConfigVO;
export const BaseBizConfigAddVO = BaseBizConfigBasePO;
export const BaseBizConfigUpdateVO = {
  ...IndexVO,
  ...BaseBizConfigBasePO,
} as const satisfies Partial<Record<keyof BaseBizConfigVOLike, JSONSchema>>;

export type BaseBizConfigVOLike = BaseBizConfigPOLike;
export type BaseBizConfigAddVOLike = Omit<BaseBizConfigAddPOLike, "creatorId">;
export type BaseBizConfigUpdateVOLike = BaseBizConfigUpdatePOLike;
export type BaseBizConfigDeleteVOLike = Pick<BaseBizConfigVOLike, IndexKeyLike>;
export type BaseBizConfigGetVOLike = Pick<BaseBizConfigVOLike, IndexKeyLike>;

export const BaseBizConfigAddKeys = [
  "tenantId",
  "namespace",
  "configKey",
  "isEnabled",
  "isPrimary",
  "configValue",
] as const satisfies RequiredKeys<BaseBizConfigAddVOLike>[];

export const BaseBizConfigUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseBizConfigUpdateVOLike>[];

export const BaseBizConfigDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseBizConfigDeleteVOLike>[];

export const BaseBizConfigGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<BaseBizConfigGetVOLike>[];

const BaseBizConfigBaseKeys = [
  ...IndexKey,
  ...BaseBizConfigAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<BaseBizConfigPOLike>[];

export const BaseBizConfigListKeys = BaseBizConfigBaseKeys;
export const BaseBizConfigDetailKeys = BaseBizConfigBaseKeys;

export const BaseBizConfigSortableKeys = [
  "id",
  "namespace",
  "isEnabled",
  "isPrimary",
  "createTimeUtc",
] as const satisfies RequiredKeys<BaseBizConfigPOLike>[];

export const NamespacesResVO = {
  namespace: { type: "string", description: "命名空间" },
} as const satisfies Record<string, JSONSchema>;

export const NamespacesResKeys = ["namespace"] as const;
