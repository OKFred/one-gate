import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const systemTranslations = {
  "system.auth": [
    {
      application: "backend",
      tKey: "errorHandler.wrongPassword",
      langCodes: {
        "zh-CN": "密码错误",
        "en-US": "Invalid password",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.loginFailed",
      langCodes: {
        "zh-CN": "登录失败，请检查用户名和密码",
        "en-US": "Login failed, please check username and password",
      },
    },
  ],
  "system.role_permission": [
    {
      application: "backend",
      tKey: "errorHandler.system.rolePermission.recordNotFound",
      langCodes: {
        "zh-CN": "角色权限记录不存在",
        "en-US": "Role permission record not found",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.rolePermission.roleNotFound",
      langCodes: {
        "zh-CN": "关联角色不存在",
        "en-US": "Associated role not found",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.rolePermission.permissionNotFound",
      langCodes: {
        "zh-CN": "关联权限不存在",
        "en-US": "Associated permission not found",
      },
    },
  ],
  "system.user": [
    {
      application: "backend",
      tKey: "errorHandler.system.user.superAdminDeleteProhibited",
      langCodes: {
        "zh-CN": "超级管理员用户禁止删除",
        "en-US": "Super admin user cannot be deleted",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.user.superAdminDisableProhibited",
      langCodes: {
        "zh-CN": "超级管理员用户禁止禁用",
        "en-US": "Super admin user cannot be disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.user.assignSuperAdminRoleProhibited",
      langCodes: {
        "zh-CN": "禁止分配超级管理员角色",
        "en-US": "Assigning super admin role is prohibited",
      },
    },
  ],
  "system.department": [
    {
      application: "backend",
      tKey: "errorHandler.departmentNotExist",
      langCodes: {
        "zh-CN": "部门不存在或已被禁用",
        "en-US": "Department does not exist or has been disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.departmentHasEnabledUser",
      langCodes: {
        "zh-CN": "当前部门或子部门下存在已启用的用户，无法禁用",
        "en-US":
          "Cannot disable department: active users exist in current or child departments",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.departmentHasEnabledChildren",
      langCodes: {
        "zh-CN": "当前部门下存在未禁用的子部门，请先禁用子部门",
        "en-US":
          "Cannot disable department: enabled child departments exist, please disable them first",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.selfParent",
      langCodes: {
        "zh-CN": "不能将部门自身设为父部门",
        "en-US": "A department cannot be its own parent",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.descendantParent",
      langCodes: {
        "zh-CN": "不能将子孙部门设为父部门，会导致死循环",
        "en-US":
          "A descendant department cannot be set as a parent, it would cause a circular reference",
      },
    },
  ],
  "system.role": [
    {
      application: "backend",
      tKey: "errorHandler.roleNotExist",
      langCodes: {
        "zh-CN": "角色不存在或已被禁用",
        "en-US": "Role does not exist or has been disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.role.superAdminDeleteProhibited",
      langCodes: {
        "zh-CN": "超级管理员角色禁止删除",
        "en-US": "Super admin role cannot be deleted",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.role.superAdminUpdateProhibited",
      langCodes: {
        "zh-CN": "超级管理员角色核心属性禁止修改",
        "en-US": "Core attributes of super admin role cannot be modified",
      },
    },
  ],
  "system.menu": [
    {
      application: "backend",
      tKey: "errorHandler.menu.parentNotExist",
      langCodes: {
        "zh-CN": "父菜单不存在或已被禁用",
        "en-US": "Parent menu does not exist or has been disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.menu.selfParent",
      langCodes: {
        "zh-CN": "父菜单不能是自己",
        "en-US": "Parent menu cannot be itself",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.menu.circularParent",
      langCodes: {
        "zh-CN": "不能将子孙菜单设为父菜单，会导致环路",
        "en-US":
          "Cannot set descendant menu as parent, it causes a circular loop",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.menu.hasChildren",
      langCodes: {
        "zh-CN": "该菜单下存在子菜单，无法直接删除",
        "en-US": "Sub-menus exist, cannot delete",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.menu.hasEnabledChildren",
      langCodes: {
        "zh-CN": "该菜单下存在已启用的子菜单，请先禁用子菜单",
        "en-US": "Enabled sub-menus exist, please disable them first",
      },
    },
  ],
  "system.permission": [],
  system: [],
} satisfies Record<
  Extract<
    BusinessKey,
    | "system.auth"
    | "system.role_permission"
    | "system.user"
    | "system.department"
    | "system.role"
    | "system.menu"
    | "system.permission"
    | "system"
  >,
  TranslationInputItem[]
>;
