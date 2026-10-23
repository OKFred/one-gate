import { sql, type SQL } from "drizzle-orm";
import { registry } from "@hodor/admin/common/registry";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import { tenantGuard, type TenantContext } from "../../tenant/context";
import { TenantError } from "../../tenant/errors";

export const TELEMETRY_READ_PERMISSION = "enterprise.asset.telemetry:read";

export interface TelemetryContext extends TenantContext {
  readonly capability: "read";
  readonly permissionCode: typeof TELEMETRY_READ_PERMISSION;
}

/** Build the fixed scope; the catalog's single SQL statement performs authorization. */
export function getTelemetryContext(
  tenantId: number,
  user: UserObj
): TelemetryContext {
  const principal = user.principal;
  if (
    !principal ||
    (principal.kind !== "user" && principal.kind !== "api_token") ||
    (principal.kind === "user" && principal.userId !== user.userId)
  )
    throw new BusinessError(TenantError.NOT_VISIBLE);
  return {
    tenantId,
    principal,
    capability: "read",
    permissionCode: TELEMETRY_READ_PERMISSION,
  };
}

/** Sensitive identifiers require a separate permission, rechecked when the SQL executes. */
export function telemetryGuard(context: TelemetryContext): SQL {
  const principal = context.principal;
  const permission =
    principal.kind === "user"
      ? registry.system.access.currentUserPermissionSql(
          principal.userId,
          TELEMETRY_READ_PERMISSION
        )
      : registry.system.access.tokenUsableSql(
          principal.tokenId,
          TELEMETRY_READ_PERMISSION
        );
  return sql`(${tenantGuard(context)} AND ${permission})`;
}
