import type { InferSelectModel } from "drizzle-orm";
import type { JSONSchema } from "json-schema-to-ts";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import {
  NETWORK_ROUTING_RUNTIME_STATES,
  NETWORK_ROUTING_STATES,
  type NetworkRoutingState,
  type NetworkRoutingTarget,
} from "./domain.js";

/** 每台手机唯一的持久网络分流策略及当前状态。 */
export const mobileNetworkRoutingTable = sqliteTable(
  "admin_mobile_network_routing",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clientId: text("client_id").notNull(),
    activeTaskClientId: text("active_task_client_id"),
    policyRevision: integer("policy_revision").notNull(),
    generation: integer("generation").notNull(),
    lanCidrsJson: text("lan_cidrs_json").notNull(),
    lanProbeUrlsJson: text("lan_probe_urls_json").notNull(),
    internetProbeUrl: text("internet_probe_url").notNull(),
    probeTimeoutMs: integer("probe_timeout_ms").notNull(),
    desiredTarget: text("desired_target").$type<NetworkRoutingTarget>(),
    actualTarget: text("actual_target").$type<NetworkRoutingTarget>(),
    state: text("state").$type<NetworkRoutingState>().notNull(),
    lastTaskId: text("last_task_id"),
    lastErrorCode: text("last_error_code"),
    lastResultJson: text("last_result_json"),
    lastVerifiedTimeUtc: integer("last_verified_time_utc"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    uniqueIndex("admin_mobile_network_routing_client_unique").on(
      table.clientId
    ),
    uniqueIndex("admin_mobile_network_routing_active_task_unique").on(
      table.activeTaskClientId
    ),
    index("admin_mobile_network_routing_state_idx").on(table.state),
  ]
);

export type MobileNetworkRouting = InferSelectModel<
  typeof mobileNetworkRoutingTable
>;

const nullableString = {
  type: ["string", "null"],
  nullable: true,
} as const satisfies JSONSchema;
const nullableNumber = {
  type: ["number", "null"],
  nullable: true,
} as const satisfies JSONSchema;
const targetSchema = {
  type: ["string", "null"],
  enum: ["default", "wifi", "carrier", null],
  nullable: true,
} as const satisfies JSONSchema;

export const NetworkRoutingVO = {
  id: { type: "integer" },
  clientId: { type: "string", minLength: 1, maxLength: 100 },
  policyRevision: { type: "integer", minimum: 1 },
  generation: { type: "integer", minimum: 0 },
  lanCidrs: {
    type: "array",
    items: { type: "string" },
    minItems: 1,
    maxItems: 16,
  },
  lanProbeUrls: {
    type: "array",
    items: { type: "string" },
    minItems: 1,
    maxItems: 16,
  },
  internetProbeUrl: { type: "string", maxLength: 2048 },
  probeTimeoutMs: { type: "integer", minimum: 3000, maximum: 30000 },
  desiredTarget: targetSchema,
  actualTarget: targetSchema,
  state: { type: "string", enum: NETWORK_ROUTING_STATES },
  lastTaskId: nullableString,
  lastErrorCode: nullableString,
  lastResult: {
    type: ["object", "null"],
    nullable: true,
    additionalProperties: true,
  },
  lastVerifiedTimeUtc: nullableNumber,
  createTimeUtc: { type: "integer" },
  updateTimeUtc: nullableNumber,
} as const satisfies Record<string, JSONSchema>;

/** 设备通过 MQTT/HTTPS 双通道上报的非敏感运行状态。 */
export const NetworkRoutingStatusReportVO = {
  protocolVersion: { type: "integer", const: 1 },
  deviceId: { type: "string", minLength: 1, maxLength: 100 },
  generation: { type: "integer", minimum: 0 },
  policyRevision: {
    type: ["integer", "null"],
    minimum: 1,
    nullable: true,
  },
  target: targetSchema,
  state: { type: "string", enum: NETWORK_ROUTING_RUNTIME_STATES },
  code: { type: "string", minLength: 1, maxLength: 100 },
  message: { type: "string", maxLength: 500 },
  timestamp: { type: "integer", minimum: 0 },
  verifiedAt: nullableNumber,
  wifiInterface: nullableString,
  carrierInterface: nullableString,
} as const satisfies Record<string, JSONSchema>;
