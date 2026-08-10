import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import {
  AuditKeys,
  AuditPO,
  AuditVO,
  IndexKey,
  IndexPO,
  IndexVO,
  type AuditAddOmitKeyLike,
  type AuditUpdateOmitKeyLike,
  type IndexKeyLike,
} from "@hodor/core/db/common/schema";
import type { RequiredKeys } from "@hodor/core/types/app";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";

export const DEVICE_EVENT_TYPES = [
  "battery",
  "network",
  "sms",
  "notification",
] as const;

export type DeviceEventType = (typeof DEVICE_EVENT_TYPES)[number];
export type DeviceReportedStatus = "ONLINE" | "OFFLINE";

//----------------- Drizzle Tables ----------------//
export const mobileDeviceTable = sqliteTable(
  "admin_mobile_device",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clientId: text("client_id").notNull().unique(),
    deviceName: text("device_name"),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    remark: text("remark"),
    reportedStatus: text("reported_status").$type<DeviceReportedStatus>(),
    lastHeartbeatTimeUtc: integer("last_heartbeat_time_utc"),
    lastOnlineTimeUtc: integer("last_online_time_utc"),
    lastOfflineTimeUtc: integer("last_offline_time_utc"),
    manufacturer: text("manufacturer"),
    brand: text("brand"),
    model: text("model"),
    androidVersion: text("android_version"),
    androidSdk: integer("android_sdk"),
    autojs6Version: text("autojs6_version"),
    clientVersion: text("client_version"),
    protocolVersion: integer("protocol_version"),
    batteryLevel: integer("battery_level"),
    isCharging: integer("is_charging", { mode: "boolean" }),
    networkConnected: integer("network_connected", { mode: "boolean" }),
    networkType: text("network_type"),
    imeiStatus: text("imei_status"),
    imeiMaskedJson: text("imei_masked_json"),
    imeiCiphertext: text("imei_ciphertext"),
    serialStatus: text("serial_status"),
    serialMasked: text("serial_masked"),
    serialCiphertext: text("serial_ciphertext"),
    capabilitiesJson: text("capabilities_json"),
    reportedExtraJson: text("reported_extra_json"),
    customMetadataJson: text("custom_metadata_json"),
    customSensitiveMetadataCiphertext: text(
      "custom_sensitive_metadata_ciphertext"
    ),
    reportTokenHash: text("report_token_hash"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    index("admin_mobile_device_last_heartbeat_idx").on(
      table.lastHeartbeatTimeUtc
    ),
    index("admin_mobile_device_status_idx").on(table.reportedStatus),
  ]
);

export const mobileDeviceEventTable = sqliteTable(
  "admin_mobile_device_event",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: text("event_id").notNull(),
    clientId: text("client_id").notNull(),
    eventType: text("event_type").$type<DeviceEventType>().notNull(),
    eventTimeUtc: integer("event_time_utc").notNull(),
    summaryJson: text("summary_json"),
    payloadCiphertext: text("payload_ciphertext"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
  },
  (table) => [
    uniqueIndex("admin_mobile_device_event_client_event_unique").on(
      table.clientId,
      table.eventId
    ),
    index("admin_mobile_device_event_client_time_idx").on(
      table.clientId,
      table.eventTimeUtc
    ),
    index("admin_mobile_device_event_type_idx").on(table.eventType),
  ]
);

//----------------- PO ----------------//
const NullableString = {
  type: ["string", "null"],
  nullable: true,
} as const satisfies JSONSchema;
const NullableNumber = {
  type: ["number", "null"],
  nullable: true,
} as const satisfies JSONSchema;
const NullableBoolean = {
  type: ["boolean", "null"],
  nullable: true,
} as const satisfies JSONSchema;

const MobileDeviceBasePO = {
  clientId: {
    type: "string",
    description: "设备标识 (唯一，对应 MQTT ClientId)",
    maxLength: 100,
  },
  deviceName: {
    ...NullableString,
    description: "设备名称/别名",
    maxLength: 100,
  },
  isEnabled: { type: "boolean", description: "是否启用" },
  remark: { ...NullableString, description: "备注", maxLength: 500 },
  reportedStatus: {
    type: ["string", "null"],
    enum: ["ONLINE", "OFFLINE", null],
    nullable: true,
  },
  lastHeartbeatTimeUtc: NullableNumber,
  lastOnlineTimeUtc: NullableNumber,
  lastOfflineTimeUtc: NullableNumber,
  manufacturer: NullableString,
  brand: NullableString,
  model: NullableString,
  androidVersion: NullableString,
  androidSdk: NullableNumber,
  autojs6Version: NullableString,
  clientVersion: NullableString,
  protocolVersion: NullableNumber,
  batteryLevel: NullableNumber,
  isCharging: NullableBoolean,
  networkConnected: NullableBoolean,
  networkType: NullableString,
  imeiStatus: NullableString,
  imeiMaskedJson: NullableString,
  imeiCiphertext: NullableString,
  serialStatus: NullableString,
  serialMasked: NullableString,
  serialCiphertext: NullableString,
  capabilitiesJson: NullableString,
  reportedExtraJson: NullableString,
  customMetadataJson: NullableString,
  customSensitiveMetadataCiphertext: NullableString,
  reportTokenHash: NullableString,
} as const satisfies Partial<Record<keyof MobileDevicePOLike, JSONSchema>>;

export const MobileDevicePO = {
  ...IndexPO,
  ...MobileDeviceBasePO,
  ...AuditPO,
} as const satisfies Record<keyof MobileDevicePOLike, JSONSchema>;

export type MobileDevicePOLike = InferSelectModel<typeof mobileDeviceTable>;
type MobileDeviceSelectPOLike = InferInsertModel<typeof mobileDeviceTable>;
type MobileDeviceAddPOLike = Omit<
  MobileDeviceSelectPOLike,
  IndexKeyLike | AuditAddOmitKeyLike
>;
type MobileDeviceUpdatePOLike = Partial<
  Omit<MobileDeviceSelectPOLike, IndexKeyLike | AuditUpdateOmitKeyLike>
> &
  Pick<MobileDevicePOLike, IndexKeyLike>;
export type MobileDeviceEventPOLike = InferSelectModel<
  typeof mobileDeviceEventTable
>;

//----------------- VO ----------------//
export { IndexVO };

export const MobileDeviceAdminVO = {
  clientId: MobileDeviceBasePO.clientId,
  deviceName: MobileDeviceBasePO.deviceName,
  isEnabled: MobileDeviceBasePO.isEnabled,
  remark: MobileDeviceBasePO.remark,
} as const;

export const MobileDeviceSnapshotVO = {
  reportedStatus: MobileDeviceBasePO.reportedStatus,
  isOnline: { type: "boolean", description: "150 秒窗口内有效在线" },
  lastHeartbeatTimeUtc: NullableNumber,
  lastOnlineTimeUtc: NullableNumber,
  lastOfflineTimeUtc: NullableNumber,
  manufacturer: NullableString,
  brand: NullableString,
  model: NullableString,
  androidVersion: NullableString,
  androidSdk: NullableNumber,
  autojs6Version: NullableString,
  clientVersion: NullableString,
  protocolVersion: NullableNumber,
  batteryLevel: NullableNumber,
  isCharging: NullableBoolean,
  networkConnected: NullableBoolean,
  networkType: NullableString,
  imeiStatus: NullableString,
  imeiMasked: {
    type: "array",
    items: { type: "string" },
  },
  serialStatus: NullableString,
  serialMasked: NullableString,
  capabilities: { type: "object", additionalProperties: true },
  reportedExtra: { type: "object", additionalProperties: true },
  customMetadata: { type: "object", additionalProperties: true },
} as const satisfies Record<string, JSONSchema>;

export const MobileDeviceVO = {
  ...IndexVO,
  ...MobileDeviceAdminVO,
  ...MobileDeviceSnapshotVO,
  ...AuditVO,
} as const satisfies Record<string, JSONSchema>;

export const MobileDeviceAddVO = MobileDeviceAdminVO;
export const MobileDeviceUpdateVO = { ...IndexVO, ...MobileDeviceAdminVO };

export type MobileDeviceAddVOLike = Omit<MobileDeviceAddPOLike, "creatorId">;
export type MobileDeviceUpdateVOLike = MobileDeviceUpdatePOLike;

export const MobileDeviceAddKeys = [
  "clientId",
  "isEnabled",
] as const satisfies RequiredKeys<MobileDeviceAddVOLike>[];
export const MobileDeviceUpdateKeys = [
  ...IndexKey,
] as const satisfies RequiredKeys<MobileDeviceUpdateVOLike>[];
export const MobileDeviceDeleteKeys = [...IndexKey] as const;
export const MobileDeviceGetKeys = [...IndexKey] as const;

export const MobileDeviceListKeys = [
  ...IndexKey,
  "clientId",
  "deviceName",
  "isEnabled",
  "remark",
  ...Object.keys(MobileDeviceSnapshotVO),
  ...AuditKeys,
] as const;
export const MobileDeviceDetailKeys = MobileDeviceListKeys;

export const MobileDeviceSortableKeys = [
  "id",
  "clientId",
  "deviceName",
  "isEnabled",
  "lastHeartbeatTimeUtc",
  "batteryLevel",
  "createTimeUtc",
] as const satisfies Array<keyof MobileDevicePOLike>;

export const CustomMetadataValueVO = {
  type: "object",
  properties: {
    value: {},
    sensitive: { type: "boolean" },
  },
  required: ["value", "sensitive"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const DeviceEventVO = {
  id: IndexVO.id,
  eventId: { type: "string" },
  clientId: MobileDeviceBasePO.clientId,
  eventType: { type: "string", enum: [...DEVICE_EVENT_TYPES] },
  eventTimeUtc: { type: "number" },
  summary: { type: "object", additionalProperties: true },
  hasSensitivePayload: { type: "boolean" },
  createTimeUtc: { type: "number" },
} as const satisfies Record<string, JSONSchema>;

export const DevicePresenceReportVO = {
  protocolVersion: { type: "number", const: 2 },
  deviceId: MobileDeviceBasePO.clientId,
  status: { type: "string", enum: ["ONLINE", "OFFLINE"] },
  timestamp: { type: "number" },
} as const satisfies Record<string, JSONSchema>;

export const DeviceInfoReportVO = {
  protocolVersion: { type: "number", const: 2 },
  deviceId: MobileDeviceBasePO.clientId,
  timestamp: { type: "number" },
  manufacturer: { type: "string", maxLength: 200 },
  brand: { type: "string", maxLength: 200 },
  model: { type: "string", maxLength: 200 },
  androidVersion: { type: "string", maxLength: 100 },
  androidSdk: { type: ["number", "null"], nullable: true },
  autojs6Version: { type: "string", maxLength: 100 },
  clientVersion: { type: "string", maxLength: 100 },
  identifiers: {
    type: "object",
    properties: {
      imeis: { type: "array", items: { type: "string" }, maxItems: 4 },
      imeiStatus: { type: "string", enum: ["available", "unavailable"] },
      serialNumber: { type: ["string", "null"], nullable: true },
      serialStatus: { type: "string", enum: ["available", "unavailable"] },
    },
    required: ["imeis", "imeiStatus", "serialNumber", "serialStatus"],
    additionalProperties: false,
  },
  capabilities: { type: "object", additionalProperties: true },
  reportedExtra: { type: "object", additionalProperties: true },
} as const satisfies Record<string, JSONSchema>;

export const DeviceEventReportVO = {
  protocolVersion: { type: "number", const: 2 },
  eventId: {
    type: "string",
    pattern: "^[0-9a-fA-F-]{36}$",
  },
  deviceId: MobileDeviceBasePO.clientId,
  type: { type: "string", enum: [...DEVICE_EVENT_TYPES] },
  timestamp: { type: "number" },
  data: { type: "object", additionalProperties: true },
} as const satisfies Record<string, JSONSchema>;

export default mobileDeviceTable;
