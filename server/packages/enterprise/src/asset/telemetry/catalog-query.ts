import { sql, type SQL } from "drizzle-orm";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { TenantError } from "../../tenant/errors";
import { TELEMETRY_LIMITS, TELEMETRY_NAMESPACES } from "./domain";
import { TelemetryError } from "./errors";
import type { TelemetryCatalogContent } from "./model";

export type CatalogJoinRow = {
  hostAssetId: string;
  hostStatus: "active" | "retired";
  hostRetiredTimeUtc: unknown;
  assetId: string | null;
  assetStatus: "active" | "retired" | null;
  assetRetiredTimeUtc: unknown;
  assetModel: string | null;
  assetCreateTimeUtc: unknown;
  assetUpdateTimeUtc: unknown;
  identifierId: unknown;
  identifierType: "wwn" | "sn" | null;
  identifierNamespace: string | null;
  identifierValue: string | null;
  identifierCreateTimeUtc: unknown;
  identifierUpdateTimeUtc: unknown;
  assignmentId: unknown;
  assignmentHostAssetId: string | null;
  assignmentValidFromUtc: unknown;
  assignmentValidToUtc: unknown;
};

/** The leftmost host row survives an empty directory; all joins share one authorized snapshot. */
export function catalogQuery(
  tenantId: number,
  hostAssetId: string,
  guard: SQL,
  verified: SQL
): SQL {
  const supported = sql`((identity.identifier_type = 'wwn' AND identity.namespace = ${TELEMETRY_NAMESPACES.wwn})
    OR (identity.identifier_type = 'sn' AND identity.namespace = ${TELEMETRY_NAMESPACES.sn}))`;
  return sql`SELECT host.asset_id AS "hostAssetId", host.status AS "hostStatus",
      host.retired_time_utc AS "hostRetiredTimeUtc",
      disk.asset_id AS "assetId", disk.status AS "assetStatus", disk.retired_time_utc AS "assetRetiredTimeUtc",
      disk.model AS "assetModel", disk.create_time_utc AS "assetCreateTimeUtc", disk.update_time_utc AS "assetUpdateTimeUtc",
      identity.id AS "identifierId", identity.identifier_type AS "identifierType", identity.namespace AS "identifierNamespace",
      identity.normalized_value AS "identifierValue", identity.create_time_utc AS "identifierCreateTimeUtc",
      identity.update_time_utc AS "identifierUpdateTimeUtc", history.id AS "assignmentId",
      assigned_host.asset_id AS "assignmentHostAssetId", history.valid_from_utc AS "assignmentValidFromUtc",
      history.valid_to_utc AS "assignmentValidToUtc"
    FROM enterprise_asset AS host
    LEFT JOIN enterprise_asset AS disk ON disk.tenant_id = host.tenant_id AND disk.category = 'disk'
      AND EXISTS (SELECT 1 FROM enterprise_asset_identifier AS identity
        WHERE identity.tenant_id = disk.tenant_id AND identity.asset_id = disk.id
          AND identity.is_verified = ${verified} AND identity.confidence = 'high' AND ${supported})
    LEFT JOIN enterprise_asset_identifier AS identity ON identity.tenant_id = disk.tenant_id AND identity.asset_id = disk.id
      AND identity.is_verified = ${verified} AND identity.confidence = 'high' AND ${supported}
    LEFT JOIN enterprise_asset_assignment AS history ON history.tenant_id = disk.tenant_id AND history.asset_id = disk.id
    LEFT JOIN enterprise_asset AS assigned_host ON assigned_host.tenant_id = history.tenant_id AND assigned_host.id = history.host_asset_id
    WHERE host.tenant_id = ${tenantId} AND host.asset_id = ${hostAssetId} AND host.category = 'host' AND ${guard}
    ORDER BY disk.asset_id, identity.id, history.id
    LIMIT ${TELEMETRY_LIMITS.joinRows + 1}`;
}

function integer(value: unknown): number {
  const parsed =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isSafeInteger(parsed) || parsed < 0)
    throw new BusinessError(TelemetryError.INVALID_CATALOG);
  return parsed;
}
function nullableInteger(value: unknown): number | null {
  return value === null ? null : integer(value);
}

export function projectCatalog(
  tenantId: number,
  rows: readonly CatalogJoinRow[]
): TelemetryCatalogContent {
  if (rows.length === 0) throw new BusinessError(TenantError.NOT_VISIBLE);
  if (rows.length > TELEMETRY_LIMITS.joinRows)
    throw new BusinessError(TelemetryError.CATALOG_TOO_LARGE);
  const first = rows[0];
  type CatalogAsset = TelemetryCatalogContent["assets"][number];
  const assets = new Map<string, CatalogAsset>();
  const identifierIds = new Map<string, Set<number>>();
  const assignmentIds = new Map<string, Set<number>>();
  for (const row of rows) {
    if (row.assetId === null) continue;
    if (row.assetStatus === null)
      throw new BusinessError(TelemetryError.INVALID_CATALOG);
    let asset = assets.get(row.assetId);
    if (!asset) {
      asset = {
        assetId: row.assetId,
        status: row.assetStatus,
        retiredTimeUtc: nullableInteger(row.assetRetiredTimeUtc),
        model: row.assetModel,
        identifiers: [],
        assignments: [],
      };
      assets.set(row.assetId, asset);
      identifierIds.set(row.assetId, new Set());
      assignmentIds.set(row.assetId, new Set());
    }
    if (row.identifierId !== null) {
      const identifierId = integer(row.identifierId);
      const seen = identifierIds.get(row.assetId)!;
      if (!seen.has(identifierId)) {
        if (
          row.identifierType === null ||
          row.identifierNamespace === null ||
          row.identifierValue === null
        )
          throw new BusinessError(TelemetryError.INVALID_CATALOG);
        const namespace = TELEMETRY_NAMESPACES[row.identifierType];
        if (row.identifierNamespace !== namespace)
          throw new BusinessError(TelemetryError.INVALID_CATALOG);
        let effectiveFromUtc = Math.max(
          integer(row.identifierCreateTimeUtc),
          nullableInteger(row.identifierUpdateTimeUtc) ?? 0
        );
        if (row.identifierType === "sn")
          effectiveFromUtc = Math.max(
            effectiveFromUtc,
            integer(row.assetCreateTimeUtc),
            nullableInteger(row.assetUpdateTimeUtc) ?? 0
          );
        asset.identifiers.push({
          identifierType: row.identifierType,
          namespace,
          value: row.identifierValue,
          effectiveFromUtc,
        });
        seen.add(identifierId);
      }
    }
    if (row.assignmentId !== null) {
      const assignmentId = integer(row.assignmentId);
      const seen = assignmentIds.get(row.assetId)!;
      if (!seen.has(assignmentId)) {
        asset.assignments.push({
          assignmentId,
          hostAssetId: row.assignmentHostAssetId,
          validFromUtc: integer(row.assignmentValidFromUtc),
          validToUtc: nullableInteger(row.assignmentValidToUtc),
        });
        seen.add(assignmentId);
      }
    }
  }
  return {
    contractVersion: 1,
    tenantId,
    host: {
      assetId: first.hostAssetId,
      status: first.hostStatus,
      retiredTimeUtc: nullableInteger(first.hostRetiredTimeUtc),
    },
    assets: [...assets.values()],
  };
}
