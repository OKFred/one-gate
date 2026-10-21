import { sql, type SQL } from "drizzle-orm";
import db from "@hodor/core/db/index";
import type { AuthPrincipal, UserObj } from "@hodor/core/types/app";
import { registry } from "@hodor/admin/common/registry";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { TenantError } from "./errors";

export type TenantCapability = "read" | "edit" | "manage";
export interface TenantContext {
  readonly tenantId: number;
  readonly principal: AuthPrincipal;
  readonly capability: TenantCapability;
}

/** A disabled/deleted global owner freezes ordinary tenant access until platform recovery. */
export function activeOwnerExists(
  tenantId: number | SQL,
  exceptUserId?: number
): SQL {
  return sql`EXISTS (SELECT 1 FROM enterprise_tenant_member AS effective_owner
    WHERE effective_owner.tenant_id = ${tenantId} AND effective_owner.role = 'owner'
      AND effective_owner.is_enabled = 1
      ${exceptUserId === undefined ? sql`` : sql`AND effective_owner.user_id != ${exceptUserId}`}
      AND ${registry.system.access.userActiveSql(sql`effective_owner.user_id`)})`;
}

export function tenantGuard(context: TenantContext): SQL {
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
        AND EXISTS (SELECT 1 FROM enterprise_tenant_member AS member
          WHERE member.tenant_id = ${tenantId} AND member.user_id = ${principal.userId}
            AND member.is_enabled = 1 ${permission})`
      : capability === "read"
        ? sql`${registry.system.access.tokenUsableSql(principal.tokenId, "enterprise.asset.mapping:read")}
          AND EXISTS (SELECT 1 FROM enterprise_tenant_api_token_grant AS token_grant
            WHERE token_grant.tenant_id = ${tenantId} AND token_grant.token_id = ${principal.tokenId}
              AND token_grant.is_enabled = 1)`
        : sql`0`;
  return sql`EXISTS (SELECT 1 FROM enterprise_tenant AS tenant_access
    WHERE tenant_access.id = ${tenantId} AND tenant_access.is_enabled = 1
      AND ${activeOwnerExists(tenantId)} AND ${subject})`;
}

export function requireHuman(
  user: UserObj
): Extract<AuthPrincipal, { kind: "user" }> {
  if (user.principal?.kind !== "user" || user.principal.userId !== user.userId)
    throw new BusinessError(TenantError.HUMAN_REQUIRED);
  return user.principal;
}

export async function getTenantContext(
  tenantId: number,
  user: UserObj,
  capability: TenantCapability
): Promise<TenantContext> {
  const principal = requireHuman(user);
  const context: TenantContext = { tenantId, principal, capability };
  const [row] = await db.all<{ allowed: number }>(
    sql`SELECT 1 AS allowed WHERE ${tenantGuard(context)} LIMIT 1`
  );
  if (!row) throw new BusinessError(TenantError.NOT_VISIBLE);
  return context;
}

export async function getMappingContext(
  tenantId: number,
  user: UserObj
): Promise<TenantContext> {
  if (
    !user.principal ||
    (user.principal.kind !== "user" && user.principal.kind !== "api_token")
  )
    throw new BusinessError(TenantError.NOT_VISIBLE);
  if (user.principal.kind === "user")
    return getTenantContext(tenantId, user, "read");
  const context: TenantContext = {
    tenantId,
    principal: user.principal,
    capability: "read",
  };
  const [row] = await db.all<{ allowed: number }>(
    sql`SELECT 1 AS allowed WHERE ${tenantGuard(context)} LIMIT 1`
  );
  if (!row) throw new BusinessError(TenantError.NOT_VISIBLE);
  return context;
}
