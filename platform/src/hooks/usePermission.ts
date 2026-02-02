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
  /** 权限管理 */
  PERMISSION: {
    ADD: 'button:permission:add',
    EDIT: 'button:permission:edit',
    DELETE: 'button:permission:delete',
  },
  /** 角色权限管理 */
  ROLE_PERMISSION: {
    ADD: 'button:role-permission:add',
    EDIT: 'button:role-permission:edit',
    DELETE: 'button:role-permission:delete',
    BATCH_DELETE: 'button:role-permission:batch-delete',
  },
};

export const I18N = {
  /** 语言管理 */
  LANGUAGE: {
    ADD: 'button:language:add',
    EDIT: 'button:language:edit',
    DELETE: 'button:language:delete',
  },
  /** 地区管理 */
  REGION: {
    ADD: 'button:region:add',
    EDIT: 'button:region:edit',
    DELETE: 'button:region:delete',
  },
  /** 翻译管理 */
  TRANSLATION: {
    ADD: 'button:translation:add',
    EDIT: 'button:translation:edit',
    DELETE: 'button:translation:delete',
  },
};

export const MAIL = {
  /** 邮件账户 */
  ACCOUNT: {
    ADD: 'button:mail-account:add',
    EDIT: 'button:mail-account:edit',
    DELETE: 'button:mail-account:delete',
  },
  /** 邮件模板 */
  TEMPLATE: {
    ADD: 'button:mail-template:add',
    EDIT: 'button:mail-template:edit',
    DELETE: 'button:mail-template:delete',
  },
  /** 邮件日志 */
  LOG: {
    VIEW: 'button:mail-log:view',
  },
};

export const AUTH = {
  /** 个人信息 */
  PROFILE: {
    EDIT: 'button:profile:edit',
    CHANGE_PASSWORD: 'button:profile:change-password',
  },
};
