import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { JSONSchema } from "json-schema-to-ts";
import { mobileDeviceTable } from "../../device/model.js";
import { MOBILE_TASK_PRIORITIES } from "../domain/task.js";

export const mobileTaskRuntimeTable = sqliteTable("admin_mobile_task_runtime", {
  clientId: text("client_id")
    .primaryKey()
    .notNull()
    .references(() => mobileDeviceTable.clientId, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  sessionStartedAt: integer("session_started_at").notNull(),
  revision: integer("revision").notNull(),
  deviceTimeUtc: integer("device_time_utc").notNull(),
  receivedTimeUtc: integer("received_time_utc").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
});

const clientId = {
  type: "string",
  pattern: "^[A-Za-z0-9._:-]{1,100}$",
} as const;
const taskId = {
  type: "string",
  pattern: "^[A-Za-z0-9_-]{8,100}$",
} as const;
const timestamp = { type: "integer", minimum: 0 } as const;
const nullableTimestamp = {
  type: ["integer", "null"],
  minimum: 0,
  nullable: true,
} as const;
const itemProperties = {
  taskId,
  scriptId: { type: "string", pattern: "^[a-z0-9._-]{1,100}$" },
  priority: { type: "string", enum: MOBILE_TASK_PRIORITIES },
  createdAt: timestamp,
  startedAt: nullableTimestamp,
  position: {
    type: ["integer", "null"],
    minimum: 1,
    maximum: 256,
    nullable: true,
  },
  phase: { type: "string", enum: ["STARTING", "RUNNING", "QUEUED"] },
  cancellable: { type: "boolean" },
} as const;
const item = {
  type: "object",
  properties: itemProperties,
  required: [
    "taskId",
    "scriptId",
    "priority",
    "createdAt",
    "startedAt",
    "position",
    "phase",
    "cancellable",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const MobileTaskRuntimeReportSchema = {
  type: "object",
  properties: {
    protocolVersion: { type: "integer", const: 2 },
    deviceId: clientId,
    timestamp,
    sessionId: { type: "string", pattern: "^[A-Za-z0-9_-]{8,100}$" },
    sessionStartedAt: timestamp,
    revision: { type: "integer", minimum: 1 },
    running: { anyOf: [item, { type: "null" }] },
    queued: { type: "array", items: item, maxItems: 256 },
  },
  required: [
    "protocolVersion",
    "deviceId",
    "timestamp",
    "sessionId",
    "sessionStartedAt",
    "revision",
    "running",
    "queued",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const MobileTaskRuntimeStateReqSchema = {
  type: "object",
  properties: { clientId },
  required: ["clientId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const MobileTaskRuntimeStateResSchema = {
  type: "object",
  properties: {
    clientId,
    serverTimeUtc: timestamp,
    receivedTimeUtc: nullableTimestamp,
    stale: { type: "boolean" },
    snapshot: { anyOf: [MobileTaskRuntimeReportSchema, { type: "null" }] },
    cancellableTaskIds: { type: "array", items: taskId, maxItems: 257 },
  },
  required: [
    "clientId",
    "serverTimeUtc",
    "receivedTimeUtc",
    "stale",
    "snapshot",
    "cancellableTaskIds",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const MobileTaskRuntimeCancelReqSchema = {
  type: "object",
  properties: { clientId, taskId },
  required: ["clientId", "taskId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const MobileTaskRuntimeCancelResSchema = {
  type: "object",
  properties: {
    taskId,
    commandId: { type: "string" },
    status: { type: "string", const: "CANCEL_REQUESTED" },
  },
  required: ["taskId", "commandId", "status"],
  additionalProperties: false,
} as const satisfies JSONSchema;
