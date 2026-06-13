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
const OssConfigBasePO = {
  name: {
    type: "string",
    description: "配置名称",
    examples: ["My S3 Storage"],
  },
  provider: {
    type: "string",
    enum: ["S3", "R2"],
    description: "存储提供商类型",
  },
  endpoint: {
    type: ["string", "null"],
    nullable: true,
    description: "服务地址 (R2 不需要)",
    examples: ["http://localhost:9000"],
  },
  accountId: {
    type: ["string", "null"],
    nullable: true,
    description: "账户 ID (仅 R2 需要)",
  },
  accessKey: {
    type: "string",
    description: "访问密钥 AK",
  },
  secretKey: {
    type: "string",
    description: "私有密钥 SK",
  },
  bucket: {
    type: "string",
    description: "存储桶名称",
  },
  region: {
    type: "string",
    description: "区域",
    default: "auto",
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
} as const satisfies Partial<Record<keyof OssConfigPOLike, JSONSchema>>;

export const OssConfigPO = {
  ...IndexPO,
  ...OssConfigBasePO,
  ...AuditPO,
} as const satisfies Record<keyof OssConfigPOLike, JSONSchema>;

export type OssConfigPOLike = InferSelectModel<typeof ossConfigTable>;
type OssConfigInsertPOLike = InferInsertModel<typeof ossConfigTable>;
type OssConfigAddPOLike = Omit<
  OssConfigPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type OssConfigUpdatePOLike = Partial<
  Omit<OssConfigInsertPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<OssConfigPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const OssConfigVO = {
  ...IndexVO,
  ...OssConfigBasePO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof OssConfigVOLike, JSONSchema>>;

export const OssConfigListVO = OssConfigVO;
export const OssConfigAddVO = OssConfigBasePO;
export const OssConfigUpdateVO = {
  ...IndexVO,
  ...OssConfigBasePO,
} as const satisfies Partial<Record<keyof OssConfigVOLike, JSONSchema>>;

export type OssConfigVOLike = OssConfigPOLike;
export type OssConfigAddVOLike = Omit<OssConfigAddPOLike, "creatorId">;
export type OssConfigUpdateVOLike = OssConfigUpdatePOLike;
export type OssConfigDeleteVOLike = Pick<OssConfigVOLike, IndexKeyLike>;
export type OssConfigGetVOLike = Pick<OssConfigVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const OssConfigAddKeys = [
  "name",
  "provider",
  "accessKey",
  "secretKey",
  "bucket",
  "isEnabled",
  "isDefault",
] as const satisfies RequiredKeys<OssConfigAddVOLike>[];

export const OssConfigUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<OssConfigUpdateVOLike>[];

export const OssConfigDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<OssConfigDeleteVOLike>[];

export const OssConfigGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<OssConfigGetVOLike>[];

const OssConfigBaseKeys = [
  ...IndexKey,
  ...OssConfigAddKeys,
  ...AuditKeys,
] as const satisfies RequiredKeys<OssConfigPOLike>[];

export const OssConfigListKeys = OssConfigBaseKeys;
export const OssConfigDetailKeys = OssConfigBaseKeys;

// 可排序字段
export const OssConfigSortableKeys = [
  "id",
  "name",
  "isEnabled",
  "isDefault",
  "createTimeUtc",
] as const satisfies RequiredKeys<OssConfigPOLike>[];

//----------------- Table ----------------//
export const ossConfigTable = sqliteTable("oss_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  provider: text("provider", { enum: ["S3", "R2"] }).notNull(),
  endpoint: text("endpoint"),
  accountId: text("account_id"),
  accessKey: text("access_key").notNull(),
  secretKey: text("secret_key").notNull(),
  bucket: text("bucket").notNull(),
  region: text("region").default("auto"),
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

export default ossConfigTable;
