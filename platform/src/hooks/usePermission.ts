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
    READ: 'system.user:read',
    ADD: 'system.user:add',
    EDIT: 'system.user:edit',
    DELETE: 'system.user:delete',
  },
  /** 部门管理 */
  DEPARTMENT: {
    READ: 'system.department:read',
    ADD: 'system.department:add',
    EDIT: 'system.department:edit',
    DELETE: 'system.department:delete',
  },
  /** 角色管理 */
  ROLE: {
    READ: 'system.role:read',
    ADD: 'system.role:add',
    EDIT: 'system.role:edit',
    DELETE: 'system.role:delete',
  },
  /** 菜单管理 */
  MENU: {
    READ: 'system.menu:read',
    ADD: 'system.menu:add',
    EDIT: 'system.menu:edit',
    DELETE: 'system.menu:delete',
  },
  /** 权限管理 */
  PERMISSION: {
    READ: 'system.permission:read',
    ADD: 'system.permission:add',
    EDIT: 'system.permission:edit',
    DELETE: 'system.permission:delete',
  },
  /** 角色权限管理 */
  ROLE_PERMISSION: {
    READ: 'system.role_permission:read',
    ADD: 'system.role_permission:add',
    EDIT: 'system.role_permission:edit',
    DELETE: 'system.role_permission:delete',
    BATCH_DELETE: 'system.role_permission:batch-delete',
  },
};

export const I18N = {
  /** 语言管理 */
  LANGUAGE: {
    READ: 'i18n.language:read',
    ADD: 'i18n.language:add',
    EDIT: 'i18n.language:edit',
    DELETE: 'i18n.language:delete',
  },
  /** 地区管理 */
  REGION: {
    READ: 'i18n.region:read',
    ADD: 'i18n.region:add',
    EDIT: 'i18n.region:edit',
    DELETE: 'i18n.region:delete',
  },
  /** 翻译管理 */
  TRANSLATION: {
    READ: 'i18n.translation:read',
    ADD: 'i18n.translation:add',
    EDIT: 'i18n.translation:edit',
    DELETE: 'i18n.translation:delete',
  },
};

export const MAIL = {
  /** 邮件账户 */
  ACCOUNT: {
    READ: 'mail.account:read',
    ADD: 'mail.account:add',
    EDIT: 'mail.account:edit',
    DELETE: 'mail.account:delete',
  },
  /** 邮件模板 */
  TEMPLATE: {
    READ: 'mail.template:read',
    ADD: 'mail.template:add',
    EDIT: 'mail.template:edit',
    DELETE: 'mail.template:delete',
  },
  /** 邮件日志 */
  LOG: {
    READ: 'mail.log:read',
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
    READ: 'maintenance.cache:read',
    ADD: 'maintenance.cache:add',
    EDIT: 'maintenance.cache:edit',
    DELETE: 'maintenance.cache:delete',
    VIEW: 'maintenance.cache:view',
  },
  /** 定时任务管理 */
  CRON: {
    READ: 'maintenance.cron:read',
    ADD: 'maintenance.cron:add',
    EDIT: 'maintenance.cron:edit',
    DELETE: 'maintenance.cron:delete',
  },
  /** JS脚本管理 */
  SCRIPT: {
    READ: 'maintenance.script:read',
    ADD: 'maintenance.script:add',
    EDIT: 'maintenance.script:edit',
    DELETE: 'maintenance.script:delete',
  },
};

export const OSS = {
  /** 存储配置 */
  CONFIG: {
    READ: 'oss.config:read',
    ADD: 'oss.config:add',
    EDIT: 'oss.config:edit',
    DELETE: 'oss.config:delete',
  },
  /** 文件管理 */
  FILE: {
    READ: 'oss.file:read',
    ADD: 'oss.file:add',
    EDIT: 'oss.file:edit',
    DELETE: 'oss.file:delete',
  },
};

export const ENTERPRISE = {
  /** 考勤管理 */
  ATTENDANCE: {
    READ: 'enterprise.attendance:read',
    ADD: 'enterprise.attendance:add',
    EDIT: 'enterprise.attendance:edit',
    DELETE: 'enterprise.attendance:delete',
  },
};

export const SWARM = {
  /** Swarm 集群 Docker 服务管理 */
  DOCKER: {
    READ: 'swarm.docker:read',
    ADD: 'swarm.docker:add',
    EDIT: 'swarm.docker:edit',
    DELETE: 'swarm.docker:delete',
  },
  /** Swarm 节点管理 */
  NODES: {
    READ: 'swarm.nodes:read',
  },
  /** Swarm Docker配置管理 */
  DOCKER_CONFIG: {
    READ: 'swarm.docker_config:read',
    ADD: 'swarm.docker_config:add',
    EDIT: 'swarm.docker_config:edit',
    DELETE: 'swarm.docker_config:delete',
  },
};
