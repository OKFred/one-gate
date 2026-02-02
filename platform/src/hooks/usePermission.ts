import { useContext } from 'react';
import { PermissionContext } from '@/contexts/PermissionContext';

/** 权限控制 Hook */
export const usePermission = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
};

//权限码常量

export const SYSTEM = {
  /** 用户管理 */
  USER: {
    ADD: 'button:user:add',
    EDIT: 'button:user:edit',
    DELETE: 'button:user:delete',
  },
  /** 部门管理 */
  DEPARTMENT: {
    ADD: 'button:department:add',
    EDIT: 'button:department:edit',
    DELETE: 'button:department:delete',
  },
  /** 角色管理 */
  ROLE: {
    ADD: 'button:role:add',
    EDIT: 'button:role:edit',
    DELETE: 'button:role:delete',
  },
  /** 菜单管理 */
  MENU: {
    ADD: 'button:menu:add',
    EDIT: 'button:menu:edit',
    DELETE: 'button:menu:delete',
  },
};