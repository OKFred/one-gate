import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  index,
  uniqueIndex,
  unique,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import {
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";
import { tenantTable } from "../tenant/schema.pg";
import {
  AssetCategories,
  AssetStatuses,
  IdentifierTypes,
  IdentifierConfidence,
} from "./model";

function auditColumns() {
  return {
    creatorId: pgInteger("creator_id").notNull(),
    updaterId: pgInteger("updater_id"),
    createTimeUtc: pgInteger("create_time_utc").notNull(),
    updateTimeUtc: pgInteger("update_time_utc"),
  };
}

export const assetTable = pgTable(
  "enterprise_asset",
  {
    id: pgIdentity(),
    tenantId: pgInteger("tenant_id")
      .notNull()
      .references(() => tenantTable.id),
    assetId: text("asset_id").notNull(),
    assetCode: text("asset_code"),
    name: text("name").notNull(),
    category: text("category", { enum: AssetCategories }).notNull(),
    brand: text("brand"),
    model: text("model"),
    remark: text("remark"),
    status: text("status", { enum: AssetStatuses }).notNull(),
    retiredTimeUtc: pgInteger("retired_time_utc"),
    stateReason: text("state_reason"),
    ...auditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("enterprise_asset", table),
    uniqueIndex("enterprise_asset_public_id_unique").on(table.assetId),
    unique("enterprise_asset_tenant_id_unique").on(table.tenantId, table.id),
    uniqueIndex("enterprise_asset_tenant_code_unique")
      .on(table.tenantId, table.assetCode)
      .where(sql`${table.assetCode} IS NOT NULL`),
    index("enterprise_asset_tenant_status_idx").on(
      table.tenantId,
      table.status,
      table.id
    ),
    check(
      "enterprise_asset_state_check",
      sql`(${table.status} = 'active' AND ${table.retiredTimeUtc} IS NULL) OR (${table.status} = 'retired' AND ${table.retiredTimeUtc} IS NOT NULL)`
    ),
    check(
      "enterprise_asset_category_check",
      sql`${table.category} IN ('host','disk','gpu','board','sensor','meter','other')`
    ),
  ]
);

export const assetIdentifierTable = pgTable(
  "enterprise_asset_identifier",
  {
    id: pgIdentity(),
    tenantId: pgInteger("tenant_id").notNull(),
    assetId: pgInteger("asset_id").notNull(),
    identifierType: text("identifier_type", {
      enum: IdentifierTypes,
    }).notNull(),
    namespace: text("namespace").notNull(),
    value: text("value").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    source: text("source").notNull(),
    confidence: text("confidence", { enum: IdentifierConfidence }).notNull(),
    isVerified: boolean("is_verified").notNull(),
    ...auditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("enterprise_asset_identifier", table),
    foreignKey({
      columns: [table.tenantId, table.assetId],
      foreignColumns: [assetTable.tenantId, assetTable.id],
      name: "enterprise_asset_identifier_owner_fk",
    }),
    uniqueIndex("enterprise_asset_identifier_verified_unique")
      .on(
        table.tenantId,
        table.identifierType,
        table.namespace,
        table.normalizedValue
      )
      .where(sql`${table.isVerified}`),
    index("enterprise_asset_identifier_asset_idx").on(
      table.tenantId,
      table.assetId
    ),
    check(
      "enterprise_asset_identifier_type_check",
      sql`${table.identifierType} IN ('sn','wwn','gpu_uuid','sid','other')`
    ),
    check(
      "enterprise_asset_identifier_confidence_check",
      sql`${table.confidence} IN ('high','medium','low')`
    ),
  ]
);

export const assetAssignmentTable = pgTable(
  "enterprise_asset_assignment",
  {
    id: pgIdentity(),
    tenantId: pgInteger("tenant_id").notNull(),
    assetId: pgInteger("asset_id").notNull(),
    hostAssetId: pgInteger("host_asset_id"),
    location: text("location").notNull(),
    validFromUtc: pgInteger("valid_from_utc").notNull(),
    validToUtc: pgInteger("valid_to_utc"),
    reason: text("reason").notNull(),
    closeReason: text("close_reason"),
    ...auditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("enterprise_asset_assignment", table),
    foreignKey({
      columns: [table.tenantId, table.assetId],
      foreignColumns: [assetTable.tenantId, assetTable.id],
      name: "enterprise_asset_assignment_owner_fk",
    }),
    foreignKey({
      columns: [table.tenantId, table.hostAssetId],
      foreignColumns: [assetTable.tenantId, assetTable.id],
      name: "enterprise_asset_assignment_host_fk",
    }),
    index("enterprise_asset_assignment_interval_idx").on(
      table.tenantId,
      table.assetId,
      table.validFromUtc
    ),
    index("enterprise_asset_assignment_host_idx").on(
      table.tenantId,
      table.hostAssetId,
      table.validToUtc
    ),
    check(
      "enterprise_asset_assignment_interval_check",
      sql`${table.validFromUtc} >= 0 AND (${table.validToUtc} IS NULL OR ${table.validToUtc} > ${table.validFromUtc})`
    ),
    check(
      "enterprise_asset_assignment_not_self_check",
      sql`${table.hostAssetId} IS NULL OR ${table.assetId} <> ${table.hostAssetId}`
    ),
  ]
);

export const assetMeasurementBindingTable = pgTable(
  "enterprise_asset_measurement_binding",
  {
    id: pgIdentity(),
    tenantId: pgInteger("tenant_id").notNull(),
    assetId: pgInteger("asset_id").notNull(),
    sourceSystem: text("source_system").notNull(),
    collectorId: text("collector_id").notNull(),
    deviceId: text("device_id").notNull(),
    metric: text("metric").notNull(),
    channel: text("channel").notNull(),
    validFromUtc: pgInteger("valid_from_utc").notNull(),
    validToUtc: pgInteger("valid_to_utc"),
    reason: text("reason").notNull(),
    closeReason: text("close_reason"),
    ...auditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("enterprise_asset_measurement_binding", table),
    foreignKey({
      columns: [table.tenantId, table.assetId],
      foreignColumns: [assetTable.tenantId, assetTable.id],
      name: "enterprise_asset_binding_owner_fk",
    }),
    index("enterprise_asset_binding_asset_idx").on(
      table.tenantId,
      table.assetId,
      table.validFromUtc
    ),
    index("enterprise_asset_binding_source_idx").on(
      table.tenantId,
      table.sourceSystem,
      table.collectorId,
      table.deviceId,
      table.metric,
      table.channel,
      table.validFromUtc
    ),
    check(
      "enterprise_asset_binding_interval_check",
      sql`${table.validFromUtc} >= 0 AND (${table.validToUtc} IS NULL OR ${table.validToUtc} > ${table.validFromUtc})`
    ),
  ]
);
