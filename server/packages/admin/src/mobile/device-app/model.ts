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
const MobileDeviceAppBasePO = {
  clientId: {
    type: "string",
    description: "设备标识",
    maxLength: 100,
  },
  appId: {
    type: "integer",
    description: "关联 mobile_app.id",
  },
  installedVersionCode: {
    type: "integer",
    description: "已安装的版本号",
  },
  installedVersionName: {
    type: "string",
    description: "已安装的版本名",
    maxLength: 50,
  },
  installStatus: {
    type: "string",
    description: "状态 (INSTALLED, INSTALLING, FAILED, UNINSTALLED)",
    enum: ["INSTALLED", "INSTALLING", "FAILED", "UNINSTALLED"],
  },
  lastSyncTimeUtc: {
    type: "integer",
    description: "最后一次同步时间",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Partial<Record<keyof MobileDeviceAppPOLike, JSONSchema>>;

export const MobileDeviceAppPO = {
  ...IndexPO,
  ...MobileDeviceAppBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MobileDeviceAppPOLike, JSONSchema>;

export type MobileDeviceAppPOLike = InferSelectModel<
  typeof mobileDeviceAppTable
>;
type MobileDeviceAppSelectPOLike = InferInsertModel<
  typeof mobileDeviceAppTable
>;
type MobileDeviceAppAddPOLike = Omit<
  MobileDeviceAppPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type MobileDeviceAppUpdatePOLike = Partial<
  Omit<MobileDeviceAppSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MobileDeviceAppPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const MobileDeviceAppBaseVO = MobileDeviceAppBasePO;

export const MobileDeviceAppVO = {
  ...IndexVO,
  ...MobileDeviceAppBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof MobileDeviceAppVOLike, JSONSchema>>;

export const MobileDeviceAppListVO = {
  ...MobileDeviceAppVO,
  appName: { type: "string" },
  appIconUrl: { type: ["string", "null"] },
  appPackageName: { type: "string" },
} as const satisfies Partial<Record<string, JSONSchema>>;
export const MobileDeviceAppAddVO = {
  clientId: MobileDeviceAppBasePO.clientId,
  appId: MobileDeviceAppBasePO.appId,
  installedVersionCode: MobileDeviceAppBasePO.installedVersionCode,
  installedVersionName: MobileDeviceAppBasePO.installedVersionName,
  installStatus: MobileDeviceAppBasePO.installStatus,
  lastSyncTimeUtc: MobileDeviceAppBasePO.lastSyncTimeUtc,
  remark: MobileDeviceAppBasePO.remark,
} as const satisfies Partial<Record<keyof MobileDeviceAppVOLike, JSONSchema>>;

export const MobileDeviceAppUpdateVO = {
  ...IndexVO,
  ...MobileDeviceAppAddVO,
} as const satisfies Partial<Record<keyof MobileDeviceAppVOLike, JSONSchema>>;

export type MobileDeviceAppVOLike = MobileDeviceAppPOLike;
export type MobileDeviceAppAddVOLike = Omit<
  MobileDeviceAppAddPOLike,
  "creatorId"
>;
export type MobileDeviceAppUpdateVOLike = MobileDeviceAppUpdatePOLike;
export type MobileDeviceAppDeleteVOLike = Pick<
  MobileDeviceAppVOLike,
  IndexKeyLike
>;
export type MobileDeviceAppGetVOLike = Pick<
  MobileDeviceAppVOLike,
  IndexKeyLike
>;

//----------------- Required Keys ----------------//
export const MobileDeviceAppAddKeys = [
  "clientId",
  "appId",
  "installedVersionCode",
  "installedVersionName",
  "installStatus",
  "lastSyncTimeUtc",
] as const satisfies RequiredKeys<MobileDeviceAppAddVOLike>[];

export const MobileDeviceAppUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileDeviceAppUpdateVOLike>[];

export const MobileDeviceAppDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileDeviceAppDeleteVOLike>[];

export const MobileDeviceAppGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileDeviceAppGetVOLike>[];

const MobileDeviceAppBaseKeys = [
  ...IndexKey,
  "clientId",
  "appId",
  "installedVersionCode",
  "installedVersionName",
  "installStatus",
  "lastSyncTimeUtc",
  ...AuditKeys,
] as const satisfies RequiredKeys<MobileDeviceAppPOLike>[];

export const MobileDeviceAppListKeys = [
  ...MobileDeviceAppBaseKeys,
  "appName",
  "appIconUrl",
  "appPackageName",
] as const;
export const MobileDeviceAppDetailKeys = MobileDeviceAppBaseKeys;

export const MobileDeviceAppSortableKeys = [
  "id",
  "clientId",
  "appId",
  "installedVersionCode",
  "installStatus",
  "lastSyncTimeUtc",
  "createTimeUtc",
] as const satisfies RequiredKeys<MobileDeviceAppPOLike>[];

//----------------- Drizzle Tables ----------------//
export const mobileDeviceAppTable = sqliteTable(
  "admin_mobile_device_app",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clientId: text("client_id").notNull(),
    appId: integer("app_id").notNull(),
    installedVersionCode: integer("installed_version_code").notNull(),
    installedVersionName: text("installed_version_name").notNull(),
    installStatus: text("install_status")
      .$type<"INSTALLED" | "INSTALLING" | "FAILED" | "UNINSTALLED">()
      .notNull(),
    lastSyncTimeUtc: integer("last_sync_time_utc").notNull(),
    remark: text("remark"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    uniqueIndex("admin_mobile_device_app_unique").on(
      table.clientId,
      table.appId
    ),
  ]
);

export default mobileDeviceAppTable;
