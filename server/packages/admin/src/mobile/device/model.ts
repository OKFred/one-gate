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
const MobileDeviceBasePO = {
  clientId: {
    type: "string",
    description: "设备标识 (唯一，对应 MQTT ClientId)",
    maxLength: 100,
  },
  deviceName: {
    type: ["string", "null"],
    nullable: true,
    description: "设备名称/别名",
    maxLength: 100,
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
} as const satisfies Partial<Record<keyof MobileDevicePOLike, JSONSchema>>;

export const MobileDevicePO = {
  ...IndexPO,
  ...MobileDeviceBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MobileDevicePOLike, JSONSchema>;

export type MobileDevicePOLike = InferSelectModel<typeof mobileDeviceTable>;
type MobileDeviceSelectPOLike = InferInsertModel<typeof mobileDeviceTable>;
type MobileDeviceAddPOLike = Omit<
  MobileDevicePOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type MobileDeviceUpdatePOLike = Partial<
  Omit<MobileDeviceSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MobileDevicePOLike, IndexKeyLike>;

//----------------- VO ----------------//
export { IndexVO };
export const MobileDeviceBaseVO = MobileDeviceBasePO;

export const MobileDeviceVO = {
  ...IndexVO,
  ...MobileDeviceBaseVO,
  ...AuditVO,
} as const satisfies Partial<Record<keyof MobileDeviceVOLike, JSONSchema>>;

export const MobileDeviceListVO = MobileDeviceVO;
export const MobileDeviceAddVO = {
  clientId: MobileDeviceBasePO.clientId,
  deviceName: MobileDeviceBasePO.deviceName,
  isEnabled: MobileDeviceBasePO.isEnabled,
  remark: MobileDeviceBasePO.remark,
} as const satisfies Partial<Record<keyof MobileDeviceVOLike, JSONSchema>>;

export const MobileDeviceUpdateVO = {
  ...IndexVO,
  ...MobileDeviceAddVO,
} as const satisfies Partial<Record<keyof MobileDeviceVOLike, JSONSchema>>;

export type MobileDeviceVOLike = MobileDevicePOLike;
export type MobileDeviceAddVOLike = Omit<MobileDeviceAddPOLike, "creatorId">;
export type MobileDeviceUpdateVOLike = MobileDeviceUpdatePOLike;
export type MobileDeviceDeleteVOLike = Pick<MobileDeviceVOLike, IndexKeyLike>;
export type MobileDeviceGetVOLike = Pick<MobileDeviceVOLike, IndexKeyLike>;

//----------------- Required Keys ----------------//
export const MobileDeviceAddKeys = [
  "clientId",
  "isEnabled",
] as const satisfies RequiredKeys<MobileDeviceAddVOLike>[];

export const MobileDeviceUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileDeviceUpdateVOLike>[];

export const MobileDeviceDeleteKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileDeviceDeleteVOLike>[];

export const MobileDeviceGetKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileDeviceGetVOLike>[];

const MobileDeviceBaseKeys = [
  ...IndexKey,
  "clientId",
  "deviceName",
  "isEnabled",
  ...AuditKeys,
] as const satisfies RequiredKeys<MobileDevicePOLike>[];

export const MobileDeviceListKeys = MobileDeviceBaseKeys;
export const MobileDeviceDetailKeys = MobileDeviceBaseKeys;

export const MobileDeviceSortableKeys = [
  "id",
  "clientId",
  "deviceName",
  "isEnabled",
  "createTimeUtc",
] as const satisfies RequiredKeys<MobileDevicePOLike>[];

//----------------- Drizzle Tables ----------------//
export const mobileDeviceTable = sqliteTable("admin_mobile_device", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: text("client_id").notNull().unique(),
  deviceName: text("device_name"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
  remark: text("remark"),
  creatorId: integer("creator_id").notNull(),
  updaterId: integer("updater_id"),
  createTimeUtc: integer("create_time_utc")
    .notNull()
    .default(getCurrentTimestampUtcSql()),
  updateTimeUtc: integer("update_time_utc"),
});

export default mobileDeviceTable;
