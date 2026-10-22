import { sql, type SQL } from "drizzle-orm";
import { getPostgresDb } from "@hodor/core/db/postgresql/runtime";
import { postgresJsonArrayIsPositiveIds } from "@hodor/core/db/postgresql/sql";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import { RecycleBinUndoError } from "@hodor/core/db/recycle-bin";

type SoftDeleteResource = "admin.system.department" | "admin.system.role";

/** Recheck current roles inside the write transaction after acquiring the shared write lock. */
export function postgresActorCanDelete(
  actorId: number,
  resource: SoftDeleteResource
): SQL {
  return sql`(${currentUserPermissionSql(actorId, resource + ":delete")} OR ${currentUserPermissionSql(actorId, resource + ":remove")})`;
}

/** Current human RBAC state, evaluated by the mutation after its transaction lock. */
export function currentUserPermissionSql(
  actorId: number | SQL,
  permissionCode: string
): SQL {
  const roles = sql`actor.role_id_arr`;
  return sql`EXISTS (SELECT 1 FROM "system_user" AS actor
    WHERE actor.id=${actorId} AND actor.is_enabled AND ${postgresJsonArrayIsPositiveIds(roles)}
    AND EXISTS (SELECT 1 FROM system_role AS acting_role
      WHERE acting_role.is_enabled AND NOT acting_role.is_deleted
        AND ${roles} @> jsonb_build_array(acting_role.id)
        AND (acting_role.id=1 OR EXISTS (
          SELECT 1 FROM system_role_permission AS binding JOIN system_permission AS permission ON permission.id=binding.permission_id
          WHERE binding.role_id=acting_role.id AND permission.is_enabled
            AND permission.code = ${permissionCode}))))`;
}

export async function assertPostgresDeletePermission(
  actorId: number,
  resource: SoftDeleteResource,
  undo = false
) {
  const result = await getPostgresDb().execute<{ allowed: boolean }>(
    sql`SELECT ${postgresActorCanDelete(actorId, resource)} AS allowed`
  );
  if (result.rows[0]?.allowed !== true)
    throw new BusinessError(
      undo ? RecycleBinUndoError.FORBIDDEN : BusinessErrorCode.PERMISSION_DENIED
    );
}

export function postgresActorCanRecover(
  actorId: number | undefined,
  resource: SoftDeleteResource,
  action: "restore" | "purge"
): SQL {
  if (actorId === undefined) return sql`FALSE`;
  if (action === "restore")
    return sql`(${currentUserPermissionSql(actorId, resource + ":edit")} AND ${currentUserPermissionSql(actorId, "admin.maintenance.recycle_bin:restore")})`;
  return sql`EXISTS (SELECT 1 FROM "system_user" AS actor
    WHERE actor.id=${actorId} AND actor.is_enabled
      AND ${postgresJsonArrayIsPositiveIds(sql`actor.role_id_arr`)}
      AND actor.role_id_arr @> '[1]'::jsonb
      AND EXISTS (SELECT 1 FROM system_role AS platform_role
        WHERE platform_role.id=1 AND platform_role.is_enabled AND NOT platform_role.is_deleted))`;
}

export async function assertPostgresRecoveryPermission(
  actorId: number | undefined,
  resource: SoftDeleteResource,
  action: "restore" | "purge"
) {
  if (actorId === undefined)
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
  const result = await getPostgresDb().execute<{ allowed: boolean }>(
    sql`SELECT ${postgresActorCanRecover(actorId, resource, action)} AS allowed`
  );
  if (result.rows[0]?.allowed !== true)
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
}
