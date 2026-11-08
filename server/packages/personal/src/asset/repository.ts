import db from "@hodor/core/db/index";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { isPostgresBackend } from "@hodor/core/db/postgresql/runtime";
import { registry as admin } from "@hodor/admin/common/registry";
import {
  assetPlacementTable as table,
  type AssetPlacement,
  type AssetPlaceRequest,
} from "./model";
import { postgresPlacementRepository } from "./repository.pg";

export interface PlacementRepository {
  list(owner: number, tenantId: number): Promise<Map<string, AssetPlacement>>;
  place(
    owner: number,
    input: AssetPlaceRequest,
    sourceGuard: SQL,
    now: number
  ): Promise<AssetPlacement | null>;
}

export function placementWriteQuery(
  owner: number,
  input: AssetPlaceRequest,
  sourceGuard: SQL,
  now: number
): SQL {
  const permission = admin.system.access.currentUserPermissionSql(
    owner,
    "personal.asset:update"
  );
  const expected = input.expectedVersion;
  return sql`INSERT INTO personal_asset_placement
    (owner_user_id, tenant_id, asset_id, site, floor, version, create_time_utc, update_time_utc)
    SELECT ${owner}, ${input.tenantId}, ${input.assetId}, ${input.site}, ${input.floor}, 1, ${now}, ${now}
    WHERE ${sourceGuard} AND ${permission}
      AND ${expected === null ? sql`1 = 1` : sql`EXISTS (SELECT 1 FROM personal_asset_placement AS expected_placement WHERE expected_placement.owner_user_id = ${owner} AND expected_placement.tenant_id = ${input.tenantId} AND expected_placement.asset_id = ${input.assetId} AND expected_placement.version = ${expected})`}
    ON CONFLICT (owner_user_id, tenant_id, asset_id) DO UPDATE
      SET site = excluded.site, floor = excluded.floor,
          version = personal_asset_placement.version + 1, update_time_utc = excluded.update_time_utc
      WHERE personal_asset_placement.version = ${expected ?? 0} AND ${sourceGuard} AND ${permission}
    RETURNING site, floor, version, update_time_utc AS "updateTimeUtc"`;
}

export type PlacementRow = {
  site: AssetPlacement["site"];
  floor: number | string | null;
  version: number | string;
  updateTimeUtc: number | string;
};

export function placementValue(row: PlacementRow): AssetPlacement {
  const floor = row.floor === null ? null : Number(row.floor);
  if (
    floor !== null &&
    floor !== 1 &&
    floor !== 2 &&
    floor !== 3 &&
    floor !== 4
  )
    throw new Error("Invalid stored asset floor");
  return {
    site: row.site,
    floor,
    version: Number(row.version),
    updateTimeUtc: Number(row.updateTimeUtc),
  };
}

export const sqlitePlacementRepository: PlacementRepository = {
  async list(owner, tenantId) {
    const records = await db
      .select()
      .from(table)
      .where(and(eq(table.ownerUserId, owner), eq(table.tenantId, tenantId)));
    return new Map(records.map((row) => [row.assetId, placementValue(row)]));
  },
  async place(owner, input, sourceGuard, now) {
    const rows = await db.all<PlacementRow>(
      placementWriteQuery(owner, input, sourceGuard, now)
    );
    return rows[0] ? placementValue(rows[0]) : null;
  },
};

export function getPlacementRepository(): PlacementRepository {
  return isPostgresBackend()
    ? postgresPlacementRepository
    : sqlitePlacementRepository;
}
