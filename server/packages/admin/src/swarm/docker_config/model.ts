import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
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

//----------------- PO ----------------//
const SwarmDockerConfigBasePO = {
  name: {
    type: "string",
    description: "配置名称",
    examples: ["My Docker Swarm"],
  },
  host: {
    type: "string",
    description: "Docker Host 地址",
    examples: ["https://127.0.0.1:2376"],
  },
  apiVersion: {
    type: "string",
    description: "Docker API 版本",
    examples: ["v1.47"],
  },
  tlsVerify: {
    type: "boolean",
    description: "是否启用 TLS 验证",
  },
  caCert: {
    type: ["string", "null"],
    nullable: true,
    description: "CA 证书内容",
  },
  clientCert: {
    type: ["string", "null"],
    nullable: true,
    description: "客户端证书内容",
  },
  clientKey: {
    type: ["string", "null"],
    nullable: true,
    description: "客户端私钥",
  },
  cfMtlsBinding: {
    type: ["string", "null"],
    nullable: true,
    description: "Cloudflare mTLS 证书绑定名称",
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
} as const satisfies Partial<Record<keyof SwarmDockerConfigPOLike, JSONSchema>>;

export const SwarmDockerConfigPO = {
  ...IndexPO,
  ...SwarmDockerConfigBasePO,
  ...AuditPO,
} as const satisfies Record<keyof SwarmDockerConfigPOLike, JSONSchema>;

export type SwarmDockerConfigPOLike = InferSelectModel<
  typeof swarmDockerConfigTable
>;
type SwarmDockerConfigInsertPOLike = InferInsertModel<
  typeof swarmDockerConfigTable
>;
type SwarmDockerConfigAddPOLike = Omit<
  SwarmDockerConfigPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type SwarmDockerConfigUpdatePOLike = Partial<
  Omit<SwarmDockerConfigInsertPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<SwarmDockerConfigPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const SwarmDockerConfigVO = {
  ...IndexVO,
  ...SwarmDockerConfigBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof SwarmDockerConfigVOLike, JSONSchema>>;

export const SwarmDockerConfigListVO = SwarmDockerConfigVO;
export const SwarmDockerConfigAddVO = SwarmDockerConfigBasePO;
export const SwarmDockerConfigUpdateVO = {
  ...IndexVO,
  ...SwarmDockerConfigBasePO,
} as const satisfies Partial<Record<keyof SwarmDockerConfigVOLike, JSONSchema>>;

export const SwarmDockerConfigDetailVO = SwarmDockerConfigVO;

export type SwarmDockerConfigVOLike = SwarmDockerConfigPOLike;
export type SwarmDockerConfigAddVOLike = Omit<
  SwarmDockerConfigAddPOLike,
  "creatorId"
>;
export type SwarmDockerConfigUpdateVOLike = SwarmDockerConfigUpdatePOLike;
export type SwarmDockerConfigDeleteVOLike = Pick<
  SwarmDockerConfigVOLike,
  IndexKeyLike
>;
export type SwarmDockerConfigGetVOLike = Pick<
  SwarmDockerConfigVOLike,
  IndexKeyLike
>;

//----------------- Required Keys ----------------//
export const SwarmDockerConfigAddKeys = [
  "name",
  "host",
  "tlsVerify",
  "isEnabled",
  "isDefault",
] as const satisfies RequiredKeys<SwarmDockerConfigAddVOLike>[];

export const SwarmDockerConfigUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<SwarmDockerConfigUpdateVOLike>[];

export const SwarmDockerConfigDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<SwarmDockerConfigDeleteVOLike>[];

export const SwarmDockerConfigGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<SwarmDockerConfigGetVOLike>[];

const SwarmDockerConfigBaseKeys = [
  ...IndexKey,
  ...SwarmDockerConfigAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<SwarmDockerConfigPOLike>[];

export const SwarmDockerConfigListKeys = SwarmDockerConfigBaseKeys;
export const SwarmDockerConfigDetailKeys = SwarmDockerConfigBaseKeys;

// 可排序字段
export const SwarmDockerConfigSortableKeys = [
  "id",
  "name",
  "isEnabled",
  "isDefault",
  "createTimeUtc",
] as const satisfies RequiredKeys<SwarmDockerConfigPOLike>[];

//----------------- Table ----------------//
export const swarmDockerConfigTable = sqliteTable("swarm_docker_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  host: text("host").notNull(),
  apiVersion: text("api_version"),
  tlsVerify: integer("tls_verify", { mode: "boolean" }).notNull(),
  caCert: text("ca_cert"),
  clientCert: text("client_cert"),
  clientKey: text("client_key"),
  cfMtlsBinding: text("cf_mtls_binding"),
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

export default swarmDockerConfigTable;
