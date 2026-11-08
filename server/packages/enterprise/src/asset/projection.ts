import { sql, type SQL } from "drizzle-orm";
import db from "@hodor/core/db/index";
import type { UserObj } from "@hodor/core/types/app";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import { HTTPException } from "hono/http-exception";
import { registry as admin } from "@hodor/admin/common/registry";
import {
  getPostgresDb,
  isPostgresBackend,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import {
  requireHuman,
  tenantGuard,
  type TenantContext,
} from "../tenant/context";
import type {
  AssetProjection,
  EnterpriseAssetProjection,
} from "../common/registry";

async function projectionRows(query: SQL): Promise<AssetProjection[]> {
  if (isPostgresBackend())
    return withPostgresTransaction(
      async () => (await getPostgresDb().execute<AssetProjection>(query)).rows
    );
  return db.all<AssetProjection>(query);
}

async function allowed(query: SQL): Promise<boolean> {
  const result = isPostgresBackend()
    ? await withPostgresTransaction(
        async () =>
          (await getPostgresDb().execute<{ allowed: number }>(query)).rows
      )
    : await db.all<{ allowed: number }>(query);
  return result.length === 1;
}

function access(tenantId: number, user: UserObj): SQL {
  const principal = requireHuman(user);
  const context: TenantContext = {
    tenantId,
    principal,
    capability: "read",
    permissionCode: "enterprise.asset:read",
  };
  return sql`(${tenantGuard(context)} AND ${admin.system.access.currentUserPermissionSql(principal.userId, "enterprise.asset:read")})`;
}

function readableAssetSql(
  tenantId: number,
  assetId: string,
  user: UserObj
): SQL {
  return sql`EXISTS (SELECT 1 FROM enterprise_asset AS projection_asset
    WHERE projection_asset.tenant_id = ${tenantId} AND projection_asset.asset_id = ${assetId}
      AND ${access(tenantId, user)})`;
}

export const assetProjection: EnterpriseAssetProjection = {
  readableAssetSql,
  async assertReadable(tenantId, assetId, user) {
    if (
      !(await allowed(sql`SELECT 1 AS allowed
      WHERE ${readableAssetSql(tenantId, assetId, user)}`))
    )
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  },
  async list(tenantId, user, asOfUtc) {
    const guard = access(tenantId, user);
    if (!(await allowed(sql`SELECT 1 AS allowed WHERE ${guard}`)))
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    const result =
      await projectionRows(sql`SELECT source.asset_id AS "assetId", source.name,
      source.category, source.status AS "inventoryStatus",
      (SELECT host.asset_id FROM enterprise_asset_assignment AS placement_host
        JOIN enterprise_asset AS host ON host.tenant_id = placement_host.tenant_id AND host.id = placement_host.host_asset_id
        WHERE placement_host.tenant_id = source.tenant_id AND placement_host.asset_id = source.id
          AND placement_host.valid_from_utc <= ${asOfUtc}
          AND (placement_host.valid_to_utc IS NULL OR ${asOfUtc} < placement_host.valid_to_utc)
        ORDER BY placement_host.valid_from_utc DESC, placement_host.id DESC LIMIT 1) AS "hostAssetId"
      FROM enterprise_asset AS source
      WHERE source.tenant_id = ${tenantId} AND ${guard}
      ORDER BY source.name, source.asset_id LIMIT 1001`);
    if (result.length > 1000)
      throw new HTTPException(413, {
        message: "errorHandler.personal.asset.tooManyAssets",
        cause: { error: { code: "ASSET_PROJECTION_LIMIT_EXCEEDED" } },
      });
    return result;
  },
};
