import { or, sql, type SQL } from "drizzle-orm";
import { registry } from "@hodor/admin/common/registry";
import { permissionCodesForAction } from "@hodor/core/middleware/auth/permission";
import type { TenantContext } from "./context";

export function postgresHumanPermissionSql(
  userId: number,
  permissionCode: string
): SQL {
  const separator = permissionCode.lastIndexOf(":");
  if (separator < 1) return sql`FALSE`;
  return (
    or(
      ...permissionCodesForAction(
        permissionCode.slice(separator + 1),
        permissionCode.slice(0, separator)
      ).map((code) =>
        registry.system.access.currentUserPermissionSql(userId, code)
      )
    ) ?? sql`FALSE`
  );
}

export function postgresActiveOwnerExists(
  tenantId: number | SQL,
  exceptUserId?: number
): SQL {
  return sql`EXISTS (SELECT 1 FROM enterprise_tenant_member AS effective_owner
    WHERE effective_owner.tenant_id = ${tenantId} AND effective_owner.role = 'owner'
      AND effective_owner.is_enabled = TRUE
      ${exceptUserId === undefined ? sql`` : sql`AND effective_owner.user_id != ${exceptUserId}`}
      AND ${registry.system.access.userActiveSql(sql`effective_owner.user_id`)})`;
}

export function postgresTenantGuard(context: TenantContext): SQL {
  const { tenantId, principal, capability } = context;
  const permission =
    capability === "read"
      ? sql``
      : capability === "edit"
        ? sql`AND member.role IN ('owner','admin','editor')`
        : sql`AND member.role IN ('owner','admin')`;
  const subject =
    principal.kind === "user"
      ? sql`${registry.system.access.userActiveSql(principal.userId)}
        ${context.permissionCode === undefined ? sql`` : sql`AND ${postgresHumanPermissionSql(principal.userId, context.permissionCode)}`}
        AND EXISTS (
        SELECT 1 FROM enterprise_tenant_member AS member WHERE member.tenant_id = ${tenantId}
          AND member.user_id = ${principal.userId} AND member.is_enabled = TRUE ${permission})`
      : capability === "read"
        ? sql`${registry.system.access.tokenUsableSql(principal.tokenId, "enterprise.asset.mapping:read")}
          AND EXISTS (SELECT 1 FROM enterprise_tenant_api_token_grant AS token_grant
            WHERE token_grant.tenant_id = ${tenantId} AND token_grant.token_id = ${principal.tokenId}
              AND token_grant.is_enabled = TRUE)`
        : sql`FALSE`;
  return sql`EXISTS (SELECT 1 FROM enterprise_tenant AS tenant_access WHERE tenant_access.id = ${tenantId}
    AND tenant_access.is_enabled = TRUE AND ${postgresActiveOwnerExists(tenantId)} AND ${subject})`;
}
