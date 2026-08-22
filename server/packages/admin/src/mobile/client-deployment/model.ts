import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { JSONSchema } from "json-schema-to-ts";

import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import type {
  ClientDeploymentActivationMode,
  ClientDeploymentPhase,
  ClientEnvironmentName,
} from "./domain/deployment.js";

/** 客户端发布状态。 */
export type ClientReleaseStatus = "PUBLISHED" | "REVOKED";

/** 不可变客户端发布表。 */
export const mobileClientReleaseTable = sqliteTable(
  "admin_mobile_client_release",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    releaseVersion: text("release_version").notNull(),
    artifactKey: text("artifact_key").notNull(),
    artifactSha256: text("artifact_sha256").notNull(),
    artifactSize: integer("artifact_size").notNull(),
    manifestJson: text("manifest_json").notNull(),
    status: text("status").$type<ClientReleaseStatus>().notNull(),
    releaseNotes: text("release_notes"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    uniqueIndex("admin_mobile_client_release_version_unique").on(
      table.releaseVersion
    ),
    uniqueIndex("admin_mobile_client_release_digest_unique").on(
      table.artifactSha256
    ),
    index("admin_mobile_client_release_status_idx").on(table.status),
  ]
);

/** 客户端环境名称表。 */
export const mobileClientEnvironmentTable = sqliteTable(
  "admin_mobile_client_environment",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").$type<ClientEnvironmentName>().notNull(),
    activeRevisionId: integer("active_revision_id"),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    uniqueIndex("admin_mobile_client_environment_name_unique").on(table.name),
  ]
);

/** 客户端环境不可变修订表。 */
export const mobileClientEnvironmentRevisionTable = sqliteTable(
  "admin_mobile_client_environment_revision",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    environmentId: integer("environment_id").notNull(),
    revision: integer("revision").notNull(),
    configJson: text("config_json").notNull(),
    requiredSecretKeysJson: text("required_secret_keys_json").notNull(),
    creatorId: integer("creator_id").notNull(),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
  },
  (table) => [
    uniqueIndex("admin_mobile_client_env_revision_unique").on(
      table.environmentId,
      table.revision
    ),
  ]
);

/** 单台设备客户端部署记录。 */
export const mobileClientDeploymentTable = sqliteTable(
  "admin_mobile_client_deployment",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deploymentId: text("deployment_id").notNull(),
    clientId: text("client_id").notNull(),
    activeClientId: text("active_client_id"),
    releaseId: integer("release_id").notNull(),
    releaseVersion: text("release_version").notNull(),
    releaseDigest: text("release_digest").notNull(),
    environmentRevisionId: integer("environment_revision_id").notNull(),
    environment: text("environment").$type<ClientEnvironmentName>().notNull(),
    environmentRevision: integer("environment_revision").notNull(),
    activationMode: text("activation_mode")
      .$type<ClientDeploymentActivationMode>()
      .notNull(),
    drainTimeoutMs: integer("drain_timeout_ms").notNull(),
    phase: text("phase").$type<ClientDeploymentPhase>().notNull(),
    previousReleaseVersion: text("previous_release_version"),
    previousReleaseDigest: text("previous_release_digest"),
    previousEnvironment: text(
      "previous_environment"
    ).$type<ClientEnvironmentName>(),
    previousEnvironmentRevision: integer("previous_environment_revision"),
    resultCode: text("result_code"),
    resultMessage: text("result_message"),
    expiresAtUtc: integer("expires_at_utc").notNull(),
    startedAtUtc: integer("started_at_utc"),
    finishedAtUtc: integer("finished_at_utc"),
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    uniqueIndex("admin_mobile_client_deployment_id_unique").on(
      table.deploymentId
    ),
    uniqueIndex("admin_mobile_client_deployment_active_device_unique").on(
      table.activeClientId
    ),
    index("admin_mobile_client_deployment_device_time_idx").on(
      table.clientId,
      table.createTimeUtc
    ),
    index("admin_mobile_client_deployment_phase_idx").on(table.phase),
  ]
);

export type MobileClientRelease = InferSelectModel<
  typeof mobileClientReleaseTable
>;
export type MobileClientReleaseInsert = InferInsertModel<
  typeof mobileClientReleaseTable
>;
export type MobileClientEnvironment = InferSelectModel<
  typeof mobileClientEnvironmentTable
>;
export type MobileClientEnvironmentRevision = InferSelectModel<
  typeof mobileClientEnvironmentRevisionTable
>;
export type MobileClientDeployment = InferSelectModel<
  typeof mobileClientDeploymentTable
>;

const nullableString = {
  type: ["string", "null"],
  nullable: true,
} as const satisfies JSONSchema;
const nullableNumber = {
  type: ["number", "null"],
  nullable: true,
} as const satisfies JSONSchema;

/** 客户端发布接口字段。 */
export const ClientReleaseVO = {
  id: { type: "integer" },
  releaseVersion: { type: "string", maxLength: 100 },
  artifactKey: { type: "string", maxLength: 1000 },
  artifactSha256: { type: "string", minLength: 64, maxLength: 64 },
  artifactSize: { type: "integer", minimum: 1, maximum: 104857600 },
  manifest: { type: "object", additionalProperties: true },
  status: { type: "string", enum: ["PUBLISHED", "REVOKED"] },
  releaseNotes: nullableString,
  creatorId: { type: "integer" },
  updaterId: nullableNumber,
  createTimeUtc: { type: "number" },
  updateTimeUtc: nullableNumber,
} as const satisfies Record<string, JSONSchema>;

/** 客户端环境接口字段。 */
export const ClientEnvironmentVO = {
  id: { type: "integer" },
  name: {
    type: "string",
    enum: ["development", "staging", "production"],
  },
  isEnabled: { type: "boolean" },
  revision: { type: "integer", minimum: 1 },
  config: { type: "object", additionalProperties: true },
  requiredSecretKeys: {
    type: "array",
    items: { type: "string" },
    maxItems: 100,
  },
  createTimeUtc: { type: "number" },
} as const satisfies Record<string, JSONSchema>;

/** 客户端部署接口字段。 */
export const ClientDeploymentVO = {
  id: { type: "integer" },
  deploymentId: { type: "string", maxLength: 36 },
  clientId: { type: "string", maxLength: 100 },
  releaseVersion: { type: "string", maxLength: 100 },
  releaseDigest: { type: "string", maxLength: 64 },
  environment: ClientEnvironmentVO.name,
  environmentRevision: { type: "integer", minimum: 1 },
  activationMode: { type: "string", enum: ["GRACEFUL", "FORCE"] },
  drainTimeoutMs: { type: "integer" },
  phase: {
    type: "string",
    enum: [
      "PENDING",
      "STAGING",
      "DRAINING",
      "PREEMPTING",
      "ACTIVATING",
      "VERIFYING",
      "SUCCEEDED",
      "FAILED",
      "ROLLED_BACK",
      "TIMED_OUT",
      "CANCELLED",
    ],
  },
  previousReleaseVersion: nullableString,
  previousReleaseDigest: nullableString,
  previousEnvironment: {
    type: ["string", "null"],
    enum: ["development", "staging", "production", null],
    nullable: true,
  },
  previousEnvironmentRevision: nullableNumber,
  resultCode: nullableString,
  resultMessage: nullableString,
  expiresAtUtc: { type: "number" },
  startedAtUtc: nullableNumber,
  finishedAtUtc: nullableNumber,
  creatorId: { type: "integer" },
  createTimeUtc: { type: "number" },
  updateTimeUtc: nullableNumber,
} as const satisfies Record<string, JSONSchema>;

/** 设备经 HTTPS 回传的客户端部署事件字段。 */
export const ClientDeploymentReportVO = {
  protocolVersion: { type: "number", const: 1 },
  deploymentId: {
    ...ClientDeploymentVO.deploymentId,
    pattern: "^[0-9a-fA-F-]{36}$",
  },
  deviceId: ClientDeploymentVO.clientId,
  phase: ClientDeploymentVO.phase,
  code: { type: "string", minLength: 1, maxLength: 100 },
  message: { type: "string", minLength: 1, maxLength: 2000 },
  releaseVersion: ClientDeploymentVO.releaseVersion,
  environment: ClientDeploymentVO.environment,
  environmentRevision: ClientDeploymentVO.environmentRevision,
  timestamp: { type: "number" },
} as const satisfies Record<string, JSONSchema>;
