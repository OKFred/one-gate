import type { UserObj } from "../../types/app.js";
import { registry } from "../../../../admin/src/common/registry";
import { getPostgresDb } from "../../db/postgresql/runtime";
import { or, sql } from "drizzle-orm";
import {
  BusinessError,
  BusinessErrorCode,
} from "../errorHandler/businessError";

/** 通用动作映射，将抽象动作映射到具体的权限码后缀 */
const ACTION_MAP: Record<string, string[]> = {
  read: ["list", "get", "view"],
  create: ["add", "create"],
  update: ["edit", "update"],
  delete: ["delete", "remove"],
};

export function permissionCodesForAction(
  action: string,
  resource: string
): string[] {
  return [action, ...(ACTION_MAP[action] || [])].map(
    (value) => `${resource}:${value}`
  );
}

/** Called after the PG write lock, using current database authority instead of cached claims. */
export async function assertPostgresAuthority(
  user: UserObj,
  action?: string,
  resource?: string
): Promise<void> {
  const codes =
    action && resource ? permissionCodesForAction(action, resource) : [];
  const principal = user.principal;
  const active =
    principal.kind === "user"
      ? registry.system.access.userActiveSql(principal.userId)
      : registry.system.access.tokenUsableSql(principal.tokenId);
  const permissions = codes.length
    ? or(
        ...codes.map((code) =>
          principal.kind === "user"
            ? registry.system.access.currentUserPermissionSql(
                principal.userId,
                code
              )
            : registry.system.access.tokenUsableSql(principal.tokenId, code)
        )
      )
    : sql`TRUE`;
  const { rows } = await getPostgresDb().execute<{ allowed: boolean }>(
    sql`SELECT (${active} AND ${permissions}) AS allowed`
  );
  if (rows[0]?.allowed !== true)
    throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
}

/**
 * 权限检查核心函数
 * @param user 用户对象
 * @param action 动作 (如 'read', 'add', 'edit', 'delete')
 * @param resource 资源标识符 (如 'enterprise.attendance')
 * @remark 暂时先作为异步，便于后续拓展
 * @returns 是否拥有权限
 */
export async function can(
  user: UserObj,
  action: string,
  resource: string
): Promise<boolean> {
  // 核心：确保权限数据已加载
  await user.ensureLoaded();

  if (user.isSuperAdmin) return true;

  const codes = permissionCodesForAction(action, resource);
  return user.permissions.some((permission) => codes.includes(permission.code));
}
