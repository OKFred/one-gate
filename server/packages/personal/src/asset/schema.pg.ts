import { sql } from "drizzle-orm";
import { check, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { pgInteger, pgIntegerBounds } from "@hodor/core/db/postgresql/columns";

export const assetPlacementTable = pgTable(
  "personal_asset_placement",
  {
    ownerUserId: pgInteger("owner_user_id").notNull(),
    tenantId: pgInteger("tenant_id").notNull(),
    assetId: text("asset_id").notNull(),
    site: text("site", { enum: ["OpenLife", "OpenMind"] }),
    floor: pgInteger("floor"),
    version: pgInteger("version").notNull(),
    createTimeUtc: pgInteger("create_time_utc").notNull(),
    updateTimeUtc: pgInteger("update_time_utc").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerUserId, table.tenantId, table.assetId] }),
    check("personal_asset_placement_version_check", sql`${table.version} >= 1`),
    check(
      "personal_asset_placement_location_check",
      sql`(${table.site} IS NULL AND ${table.floor} IS NULL) OR (${table.site} IS NOT NULL AND ${table.floor} IS NOT NULL AND ((${table.site} = 'OpenLife' AND ${table.floor} = 1) OR (${table.site} = 'OpenMind' AND ${table.floor} BETWEEN 1 AND 4)))`
    ),
    ...pgIntegerBounds("personal_asset_placement", table),
  ]
);
