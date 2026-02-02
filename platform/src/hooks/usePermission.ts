import { useContext } from 'react';
import { PermissionContext } from '@/contexts/PermissionContext';

/**
 * 权限控制 Hook
 * @example
 * // 检查多个权限（任意一个）
 * const { hasAnyPermission } = usePermission();
 * const canEdit = hasAnyPermission(['button:user:edit', 'button:user:add']);
 *
 * @example
 * // 检查多个权限（全部）
 * const { hasAllPermissions } = usePermission();
 * const canManage = hasAllPermissions(['button:user:add', 'button:user:edit', 'button:user:delete']);
 */
export const usePermission = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
};

/**
 * 权限码常量 - 用户管理
 */
export const USER_PERMISSIONS = {
  ADD: 'button:user:add',
  EDIT: 'button:user:edit',
  DELETE: 'button:user:delete',
} as const;

/**
 * 权限码常量 - 部门管理
 */
export const DEPARTMENT_PERMISSIONS = {
  ADD: 'button:department:add',
  EDIT: 'button:department:edit',
  DELETE: 'button:department:delete',
} as const;

/**
 * 权限码常量 - 角色管理
 */
export const ROLE_PERMISSIONS = {
  ADD: 'button:role:add',
  EDIT: 'button:role:edit',
  DELETE: 'button:role:delete',
} as const;

/**
 * 权限码常量 - 菜单管理
 */
export const MENU_PERMISSIONS = {
  ADD: 'button:menu:add',
  EDIT: 'button:menu:edit',
  DELETE: 'button:menu:delete',
} as const;
