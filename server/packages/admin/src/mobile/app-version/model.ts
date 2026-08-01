import {
  sqliteTable,
  integer,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
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
const MobileAppVersionBasePO = {
  appId: {
    type: "integer",
    description: "关联 mobile_app.id (无数据库外键)",
  },
  versionName: {
    type: "string",
    description: "版本名 (如 1.0.0)",
    maxLength: 50,
  },
  versionCode: {
    type: "integer",
    description: "版本号 (整型)",
  },
  apkUrl: {
    type: "string",
    description: "安装包地址",
    maxLength: 1000,
  },
  releaseNotes: {
    type: ["string", "null"],
    nullable: true,
    description: "更新说明",
  },
  isForced: {
    type: "boolean",
    description: "是否强制更新",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof MobileAppVersionPOLike, JSONSchema>>;

export const MobileAppVersionPO = {
  ...IndexPO,
  ...MobileAppVersionBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MobileAppVersionPOLike, JSONSchema>;

export type MobileAppVersionPOLike = InferSelectModel<
  typeof mobileAppVersionTable
>;
type MobileAppVersionSelectPOLike = InferInsertModel<
  typeof mobileAppVersionTable
>;
type MobileAppVersionAddPOLike = Omit<
  MobileAppVersionPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type MobileAppVersionUpdatePOLike = Partial<
  Omit<MobileAppVersionSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MobileAppVersionPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const MobileAppVersionBaseVO = MobileAppVersionBasePO;

export const MobileAppVersionVO = {
  ...IndexVO,
  ...MobileAppVersionBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof MobileAppVersionVOLike, JSONSchema>>;

export const MobileAppVersionListVO = MobileAppVersionVO;
export const MobileAppVersionAddVO = {
  appId: MobileAppVersionBasePO.appId,
  versionName: MobileAppVersionBasePO.versionName,
  versionCode: MobileAppVersionBasePO.versionCode,
  apkUrl: MobileAppVersionBasePO.apkUrl,
  releaseNotes: MobileAppVersionBasePO.releaseNotes,
  isForced: MobileAppVersionBasePO.isForced,
  isEnabled: MobileAppVersionBasePO.isEnabled,
  remark: MobileAppVersionBasePO.remark,
} as const satisfies Partial<Record<keyof MobileAppVersionVOLike, JSONSchema>>;

export const MobileAppVersionUpdateVO = {
  ...IndexVO,
  ...MobileAppVersionAddVO,
} as const satisfies Partial<Record<keyof MobileAppVersionVOLike, JSONSchema>>;

export type MobileAppVersionVOLike = MobileAppVersionPOLike;
export type MobileAppVersionAddVOLike = Omit<
  MobileAppVersionAddPOLike,
  "creatorId"
>;
export type MobileAppVersionUpdateVOLike = MobileAppVersionUpdatePOLike;
export type MobileAppVersionDeleteVOLike = Pick<
  MobileAppVersionVOLike,
  IndexKeyLike
>;
export type MobileAppVersionGetVOLike = Pick<
  MobileAppVersionVOLike,
  IndexKeyLike
>;

//----------------- Required Keys ----------------//
export const MobileAppVersionAddKeys = [
  "appId",
  "versionName",
  "versionCode",
  "apkUrl",
  "isForced",
  "isEnabled",
] as const satisfies RequiredKeys<MobileAppVersionAddVOLike>[];

export const MobileAppVersionUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileAppVersionUpdateVOLike>[];

export const MobileAppVersionDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileAppVersionDeleteVOLike>[];

export const MobileAppVersionGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileAppVersionGetVOLike>[];

const MobileAppVersionBaseKeys = [
  ...IndexKey,
  "appId",
  "versionName",
  "versionCode",
  "apkUrl",
  "releaseNotes",
  "isForced",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<MobileAppVersionPOLike>[];

export const MobileAppVersionListKeys = MobileAppVersionBaseKeys;
export const MobileAppVersionDetailKeys = MobileAppVersionBaseKeys;

export const MobileAppVersionSortableKeys = [
  "id",
  "appId",
  "versionName",
  "versionCode",
  "isForced",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<MobileAppVersionPOLike>[];

//----------------- Drizzle Tables ----------------//
export const mobileAppVersionTable = sqliteTable(
  "admin_mobile_app_version",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id").notNull(),
    versionName: text("version_name").notNull(),
    versionCode: integer("version_code").notNull(),
    apkUrl: text("apk_url").notNull(),
    releaseNotes: text("release_notes"),
    isForced: integer("is_forced", { mode: "boolean" }).notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    uniqueIndex("admin_mobile_app_version_app_id_version_code_unique").on(
      table.appId,
      table.versionCode
    ),
  ]
);

export default mobileAppVersionTable;
