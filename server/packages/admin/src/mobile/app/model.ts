import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
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
const MobileAppBasePO = {
  packageName: {
    type: "string",
    description: "包名 (唯一, 如 org.autojs.autojs6)",
    maxLength: 255,
  },
  name: {
    type: "string",
    description: "应用名称",
    maxLength: 100,
  },
  iconUrl: {
    type: ["string", "null"],
    nullable: true,
    description: "图标 (支持 Base64 与普通 URL 链接)",
  },
  description: {
    type: ["string", "null"],
    nullable: true,
    description: "描述",
    maxLength: 500,
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
} as const satisfies Partial<Record<keyof MobileAppPOLike, JSONSchema>>;

export const MobileAppPO = {
  ...IndexPO,
  ...MobileAppBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MobileAppPOLike, JSONSchema>;

export type MobileAppPOLike = InferSelectModel<typeof mobileAppTable>;
type MobileAppSelectPOLike = InferInsertModel<typeof mobileAppTable>;
type MobileAppAddPOLike = Omit<
  MobileAppPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type MobileAppUpdatePOLike = Partial<
  Omit<MobileAppSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MobileAppPOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const MobileAppBaseVO = MobileAppBasePO;

export const MobileAppVO = {
  ...IndexVO,
  ...MobileAppBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof MobileAppVOLike, JSONSchema>>;

export const MobileAppListVO = MobileAppVO;
export const MobileAppAddVO = {
  packageName: MobileAppBasePO.packageName,
  name: MobileAppBasePO.name,
  iconUrl: MobileAppBasePO.iconUrl,
  description: MobileAppBasePO.description,
  isEnabled: MobileAppBasePO.isEnabled,
  remark: MobileAppBasePO.remark,
} as const satisfies Partial<Record<keyof MobileAppVOLike, JSONSchema>>;

export const MobileAppUpdateVO = {
  ...IndexVO,
  ...MobileAppAddVO,
} as const satisfies Partial<Record<keyof MobileAppVOLike, JSONSchema>>;

export type MobileAppVOLike = MobileAppPOLike;
export type MobileAppAddVOLike = Omit<MobileAppAddPOLike, "creatorId">;
export type MobileAppUpdateVOLike = MobileAppUpdatePOLike;
export type MobileAppDeleteVOLike = Pick<MobileAppVOLike, IndexKeyLike>;
export type MobileAppGetVOLike = Pick<MobileAppVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const MobileAppAddKeys = [
  "packageName",
  "name",
  "isEnabled",
] as const satisfies RequiredKeys<MobileAppAddVOLike>[];

export const MobileAppUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileAppUpdateVOLike>[];

export const MobileAppDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileAppDeleteVOLike>[];

export const MobileAppGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileAppGetVOLike>[];

const MobileAppBaseKeys = [
  ...IndexKey,
  "packageName",
  "name",
  "iconUrl",
  "description",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<MobileAppPOLike>[];

export const MobileAppListKeys = MobileAppBaseKeys;
export const MobileAppDetailKeys = MobileAppBaseKeys;

export const MobileAppSortableKeys = [
  "id",
  "packageName",
  "name",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<MobileAppPOLike>[];

//----------------- Drizzle Tables ----------------//
export const mobileAppTable = sqliteTable("admin_mobile_app", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  packageName: text("package_name").notNull().unique(),
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  description: text("description"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default mobileAppTable;
