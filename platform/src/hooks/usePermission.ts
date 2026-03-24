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
    ADD: 'system.user:add',
    EDIT: 'system.user:edit',
    DELETE: 'system.user:delete',
  },
  /** 部门管理 */
  DEPARTMENT: {
    ADD: 'system.department:add',
    EDIT: 'system.department:edit',
    DELETE: 'system.department:delete',
  },
  /** 角色管理 */
  ROLE: {
    ADD: 'system.role:add',
    EDIT: 'system.role:edit',
    DELETE: 'system.role:delete',
  },
  /** 菜单管理 */
  MENU: {
    ADD: 'system.menu:add',
    EDIT: 'system.menu:edit',
    DELETE: 'system.menu:delete',
  },
  /** 权限管理 */
  PERMISSION: {
    ADD: 'system.permission:add',
    EDIT: 'system.permission:edit',
    DELETE: 'system.permission:delete',
  },
  /** 角色权限管理 */
  ROLE_PERMISSION: {
    ADD: 'system.role_permission:add',
    EDIT: 'system.role_permission:edit',
    DELETE: 'system.role_permission:delete',
    BATCH_DELETE: 'system.role_permission:batch-delete',
  },
};

export const I18N = {
  /** 语言管理 */
  LANGUAGE: {
    ADD: 'i18n.language:add',
    EDIT: 'i18n.language:edit',
    DELETE: 'i18n.language:delete',
  },
  /** 地区管理 */
  REGION: {
    ADD: 'i18n.region:add',
    EDIT: 'i18n.region:edit',
    DELETE: 'i18n.region:delete',
  },
  /** 翻译管理 */
  TRANSLATION: {
    ADD: 'i18n.translation:add',
    EDIT: 'i18n.translation:edit',
    DELETE: 'i18n.translation:delete',
  },
};

export const MAIL = {
  /** 邮件账户 */
  ACCOUNT: {
    ADD: 'mail.account:add',
    EDIT: 'mail.account:edit',
    DELETE: 'mail.account:delete',
  },
  /** 邮件模板 */
  TEMPLATE: {
    ADD: 'mail.template:add',
    EDIT: 'mail.template:edit',
    DELETE: 'mail.template:delete',
  },
  /** 邮件日志 */
  LOG: {
    VIEW: 'mail.log:view',
  },
};

export const AUTH = {
  /** 个人信息 */
  PROFILE: {
    UPDATE_PROFILE: 'system.auth:update_profile',
    UPDATE_PASSWORD: 'system.auth:update_password',
  },
};

export const MAINTENANCE = {
  /** 缓存管理 */
  CACHE: {
    ADD: 'maintenance.cache:add',
    EDIT: 'maintenance.cache:edit',
    DELETE: 'maintenance.cache:delete',
    VIEW: 'maintenance.cache:view',
  },
};
