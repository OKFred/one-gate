import { sql, type InferSelectModel } from "drizzle-orm";
import {
  check,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

export const assetPlacementTable = sqliteTable(
  "personal_asset_placement",
  {
    ownerUserId: integer("owner_user_id").notNull(),
    tenantId: integer("tenant_id").notNull(),
    assetId: text("asset_id").notNull(),
    site: text("site", { enum: ["OpenLife", "OpenMind"] }),
    floor: integer("floor"),
    version: integer("version").notNull(),
    createTimeUtc: integer("create_time_utc").notNull(),
    updateTimeUtc: integer("update_time_utc").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerUserId, table.tenantId, table.assetId] }),
    check("personal_asset_placement_version_check", sql`${table.version} >= 1`),
    check(
      "personal_asset_placement_location_check",
      sql`(${table.site} IS NULL AND ${table.floor} IS NULL) OR (${table.site} IS NOT NULL AND ${table.floor} IS NOT NULL AND ((${table.site} = 'OpenLife' AND ${table.floor} = 1) OR (${table.site} = 'OpenMind' AND ${table.floor} BETWEEN 1 AND 4)))`
    ),
  ]
);

export type AssetPlacementRecord = InferSelectModel<typeof assetPlacementTable>;
const tenantId = {
  type: "integer",
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
} as const;
const uuid = {
  type: "string",
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
} as const;
const time = {
  type: "integer",
  minimum: 0,
  maximum: 8640000000000000,
} as const;
const version = {
  type: ["integer", "null"],
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER - 1,
} as const;
export const PlacementResponseSchema = {
  type: "object",
  properties: {
    site: { type: ["string", "null"], enum: ["OpenLife", "OpenMind", null] },
    floor: { type: ["integer", "null"], enum: [1, 2, 3, 4, null] },
    version,
    updateTimeUtc: { ...time, type: ["integer", "null"] },
  },
  required: ["site", "floor", "version", "updateTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const AssetOverviewRequestSchema = {
  type: "object",
  properties: { tenantId },
  required: ["tenantId"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const AssetOverviewResponseSchema = {
  type: "object",
  properties: {
    asOfUtc: time,
    presenceSource: { type: "string", const: "unconfigured" },
    assets: {
      type: "array",
      maxItems: 1000,
      items: {
        type: "object",
        properties: {
          assetId: uuid,
          name: { type: "string" },
          category: {
            type: "string",
            enum: ["host", "disk", "gpu", "board", "sensor", "meter", "other"],
          },
          inventoryStatus: { type: "string", enum: ["active", "retired"] },
          placement: PlacementResponseSchema,
          presence: {
            type: "object",
            properties: {
              status: { type: "string", const: "unknown" },
              basis: { type: "string", const: "not_connected" },
              lastHeartbeatTimeUtc: { type: "null" },
              observedTimeUtc: { type: "null" },
              expiresTimeUtc: { type: "null" },
            },
            required: [
              "status",
              "basis",
              "lastHeartbeatTimeUtc",
              "observedTimeUtc",
              "expiresTimeUtc",
            ],
            additionalProperties: false,
          },
          hostAssetId: { ...uuid, type: ["string", "null"] },
        },
        required: [
          "assetId",
          "name",
          "category",
          "inventoryStatus",
          "placement",
          "presence",
          "hostAssetId",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["asOfUtc", "presenceSource", "assets"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const AssetPlaceRequestSchema = {
  type: "object",
  properties: {
    tenantId,
    assetId: uuid,
    site: PlacementResponseSchema.properties.site,
    floor: PlacementResponseSchema.properties.floor,
    expectedVersion: version,
  },
  required: ["tenantId", "assetId", "site", "floor", "expectedVersion"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export type AssetOverviewRequest = FromSchema<
  typeof AssetOverviewRequestSchema
>;
export type AssetOverview = FromSchema<typeof AssetOverviewResponseSchema>;
export type AssetPlaceRequest = FromSchema<typeof AssetPlaceRequestSchema>;
export type AssetPlacement = FromSchema<typeof PlacementResponseSchema>;
