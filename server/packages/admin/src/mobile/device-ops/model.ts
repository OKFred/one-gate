import type { InferSelectModel } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { JSONSchema } from "json-schema-to-ts";

import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";

/** Operations session status. */
export type DeviceOpsSessionStatus =
  | "PENDING_DEVICE"
  | "CONNECTED"
  | "CLOSED"
  | "REJECTED"
  | "EXPIRED";

/** Short-lived device operations session. */
export const mobileDeviceOpsSessionTable = sqliteTable(
  "admin_mobile_device_ops_session",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id").notNull(),
    activeClientId: text("active_client_id"),
    clientId: text("client_id").notNull(),
    actorId: integer("actor_id").notNull(),
    actorName: text("actor_name").notNull(),
    status: text("status").$type<DeviceOpsSessionStatus>().notNull(),
    connectedAtUtc: integer("connected_at_utc"),
    lastActiveAtUtc: integer("last_active_at_utc"),
    expiresAtUtc: integer("expires_at_utc").notNull(),
    closedAtUtc: integer("closed_at_utc"),
    closeCode: text("close_code"),
    closeMessage: text("close_message"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    uniqueIndex("admin_mobile_device_ops_session_id_unique").on(
      table.sessionId
    ),
    uniqueIndex("admin_mobile_device_ops_active_client_unique").on(
      table.activeClientId
    ),
    index("admin_mobile_device_ops_client_time_idx").on(
      table.clientId,
      table.createTimeUtc
    ),
  ]
);

/** Encrypted operation request and response audit. */
export const mobileDeviceOpsAuditTable = sqliteTable(
  "admin_mobile_device_ops_audit",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id").notNull(),
    requestId: text("request_id").notNull(),
    clientId: text("client_id").notNull(),
    actorId: integer("actor_id").notNull(),
    operation: text("operation").notNull(),
    status: text("status").notNull(),
    resultCode: text("result_code"),
    durationMs: integer("duration_ms"),
    requestBytes: integer("request_bytes").notNull(),
    responseBytes: integer("response_bytes"),
    requestCiphertext: text("request_ciphertext").notNull(),
    responseCiphertext: text("response_ciphertext"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    finishTimeUtc: integer("finish_time_utc"),
  },
  (table) => [
    uniqueIndex("admin_mobile_device_ops_audit_request_unique").on(
      table.sessionId,
      table.requestId
    ),
    index("admin_mobile_device_ops_audit_client_time_idx").on(
      table.clientId,
      table.createTimeUtc
    ),
  ]
);

export type MobileDeviceOpsSession = InferSelectModel<
  typeof mobileDeviceOpsSessionTable
>;
export type MobileDeviceOpsAudit = InferSelectModel<
  typeof mobileDeviceOpsAuditTable
>;

const nullableString = {
  type: ["string", "null"],
  nullable: true,
} as const satisfies JSONSchema;
const nullableNumber = {
  type: ["number", "null"],
  nullable: true,
} as const satisfies JSONSchema;

/** Public session fields. */
export const DeviceOpsSessionVO = {
  sessionId: { type: "string", minLength: 8, maxLength: 100 },
  clientId: { type: "string", minLength: 1, maxLength: 100 },
  actorId: { type: "integer" },
  actorName: { type: "string" },
  status: {
    type: "string",
    enum: ["PENDING_DEVICE", "CONNECTED", "CLOSED", "REJECTED", "EXPIRED"],
  },
  connectedAtUtc: nullableNumber,
  lastActiveAtUtc: nullableNumber,
  expiresAtUtc: { type: "integer" },
  closedAtUtc: nullableNumber,
  closeCode: nullableString,
  closeMessage: nullableString,
  createTimeUtc: { type: "integer" },
  updateTimeUtc: nullableNumber,
} as const satisfies Record<string, JSONSchema>;

/** Public encrypted-audit index fields. */
export const DeviceOpsAuditVO = {
  id: { type: "integer" },
  sessionId: { type: "string" },
  requestId: { type: "string" },
  clientId: { type: "string" },
  actorId: { type: "integer" },
  operation: { type: "string" },
  status: { type: "string" },
  resultCode: nullableString,
  durationMs: nullableNumber,
  requestBytes: { type: "integer" },
  responseBytes: nullableNumber,
  createTimeUtc: { type: "integer" },
  finishTimeUtc: nullableNumber,
} as const satisfies Record<string, JSONSchema>;
