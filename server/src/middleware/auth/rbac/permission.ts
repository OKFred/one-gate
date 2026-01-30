/**
 * 权限工具函数
 * 提供权限查询和处理的工具方法
 */

import db from "@/db/index";
import { permissionTable } from "@/api/system/permission/db.table";
import { rolePermissionTable } from "@/api/system/role_permission/db.table";
import { eq, and, inArray } from "drizzle-orm";

/** 权限效果枚举 */
const Effect = {
  ALLOW: "allow",
  DENY: "deny",
} as const;

/**
 * 权限信息接口
 */
export interface PermissionInfo {
  id: number;
  code: string;
  name: string;
  category: "menu" | "button" | "api";
  resource: string | null;
  effect: (typeof Effect)[keyof typeof Effect];
  scope: "all" | "own" | "dept" | "custom";
  resourceFilter: string | null;
  conditions: string | null;
}

/**
 * 根据角色ID数组获取所有权限
 * @param roleIds 角色ID数组
 * @returns 权限信息数组
 */
export async function getPermissionsByRoleIds(
  roleIds: number[]
): Promise<PermissionInfo[]> {
  if (roleIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: permissionTable.id,
      code: permissionTable.code,
      name: permissionTable.name,
      category: permissionTable.category,
      resource: permissionTable.resource,
      effect: permissionTable.effect,
      scope: permissionTable.scope,
      resourceFilter: rolePermissionTable.resourceFilter,
      conditions: rolePermissionTable.conditions,
    })
    .from(rolePermissionTable)
    .innerJoin(
      permissionTable,
      eq(rolePermissionTable.permissionId, permissionTable.id)
    )
    .where(
      and(
        inArray(rolePermissionTable.roleId, roleIds),
        eq(permissionTable.isEnabled, true)
      )
    );

  // 类型断言，因为 drizzle 的类型推断
  return rows as PermissionInfo[];
}

/**
 * 根据权限代码获取权限信息
 * @param codes 权限代码数组
 * @returns 权限信息数组
 */
export async function getPermissionsByCodes(
  codes: string[]
): Promise<PermissionInfo[]> {
  if (codes.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: permissionTable.id,
      code: permissionTable.code,
      name: permissionTable.name,
      category: permissionTable.category,
      resource: permissionTable.resource,
      effect: permissionTable.effect,
      scope: permissionTable.scope,
    })
    .from(permissionTable)
    .where(
      and(
        inArray(permissionTable.code, codes),
        eq(permissionTable.isEnabled, true)
      )
    );

  return rows.map((row) => ({
    ...row,
    resourceFilter: null, // 单独查询权限时没有关联数据
    conditions: null,
  })) as PermissionInfo[];
}

/**
 * 过滤生效的权限（处理 allow/deny）
 * @param permissions 权限数组
 * @returns 处理后的权限数组（只包含最终允许的权限）
 */
export function filterEffectivePermissions(
  permissions: PermissionInfo[]
): PermissionInfo[] {
  // 按权限代码分组
  const permissionMap = new Map<string, PermissionInfo[]>();

  for (const perm of permissions) {
    const existing = permissionMap.get(perm.code) || [];
    existing.push(perm);
    permissionMap.set(perm.code, existing);
  }

  // 处理每个权限组
  const result: PermissionInfo[] = [];
  for (const [code, perms] of permissionMap) {
    // 如果有任何 deny，则该权限被拒绝
    const hasDeny = perms.some((p) => p.effect === Effect.DENY);
    if (!hasDeny) {
      // 只取第一个 allow 权限
      const allowPerm = perms.find((p) => p.effect === Effect.ALLOW);
      if (allowPerm) {
        result.push(allowPerm);
      }
    }
  }

  return result;
}

/**
 * 根据类型过滤权限
 * @param permissions 权限数组
 * @param category 权限类别
 * @returns 过滤后的权限数组
 */
export function filterPermissionsByType(
  permissions: PermissionInfo[],
  category: "menu" | "button" | "api"
): PermissionInfo[] {
  return permissions.filter((p) => p.category === category);
}

/**
 * 检查权限代码数组是否包含指定权限
 * @param permissions 权限数组
 * @param code 要检查的权限代码
 * @returns 是否包含该权限
 */
export function hasPermissionCode(
  permissions: PermissionInfo[],
  code: string
): boolean {
  return permissions.some((p) => p.code === code && p.effect === Effect.ALLOW);
}

/**
 * 检查权限代码数组是否包含任一指定权限
 * @param permissions 权限数组
 * @param codes 要检查的权限代码数组
 * @returns 是否包含任一权限
 */
export function hasAnyPermission(
  permissions: PermissionInfo[],
  codes: string[]
): boolean {
  return codes.some((code) => hasPermissionCode(permissions, code));
}

/**
 * 检查权限代码数组是否包含所有指定权限
 * @param permissions 权限数组
 * @param codes 要检查的权限代码数组
 * @returns 是否包含所有权限
 */
export function hasAllPermissions(
  permissions: PermissionInfo[],
  codes: string[]
): boolean {
  return codes.every((code) => hasPermissionCode(permissions, code));
}

/**
 * 获取用户的菜单权限
 * @param permissions 权限数组
 * @returns 菜单权限数组
 */
export function getMenuPermissions(
  permissions: PermissionInfo[]
): PermissionInfo[] {
  return filterPermissionsByType(permissions, "menu");
}

/**
 * 获取用户的按钮权限代码列表
 * @param permissions 权限数组
 * @returns 按钮权限代码数组
 */
export function getButtonPermissionCodes(
  permissions: PermissionInfo[]
): string[] {
  return filterPermissionsByType(permissions, "button").map((p) => p.code);
}

export const permissionUtils = {
  getPermissionsByRoleIds,
  getPermissionsByCodes,
  filterEffectivePermissions,
  filterPermissionsByType,
  hasPermissionCode,
  hasAnyPermission,
  hasAllPermissions,
  getMenuPermissions,
  getButtonPermissionCodes,
};

export default permissionUtils;
