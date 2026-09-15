import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const systemTranslations = {
  "admin.system.auth": [
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
  "admin.system.role_permission": [
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
  "admin.system.user": [
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
  "admin.system.department": [
    {
      application: "backend",
      tKey: "errorHandler.department.clockConflict",
      langCodes: {
        "zh-CN": "部门更新时间晚于服务器时间，请检查时间后重试",
        "en-US":
          "The department update time is ahead of server time; check the clock and try again",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.notActive",
      langCodes: {
        "zh-CN": "部门不存在或已删除",
        "en-US": "Department does not exist or has been deleted",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.hasReferences",
      langCodes: {
        "zh-CN": "部门仍被子部门、用户或角色引用，请先解除引用",
        "en-US":
          "The department is still referenced by a child department, user, or role",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.invalidParent",
      langCodes: {
        "zh-CN": "父部门不存在、已删除或层级无效，请先恢复父部门",
        "en-US":
          "The parent department is missing, deleted, or invalid; restore the parent first",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.invalidDepartmentIds",
      langCodes: {
        "zh-CN": "部门范围必须是正整数 ID 数组",
        "en-US": "Department scopes must be an array of positive integer IDs",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.referenceUnavailable",
      langCodes: {
        "zh-CN": "关联部门不存在或已删除，请刷新后重试",
        "en-US":
          "A referenced department is missing or deleted; refresh and try again",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.nameConflict",
      langCodes: {
        "zh-CN": "已存在同名部门，请先处理名称冲突",
        "en-US": "An active department already uses this name",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.notDeleted",
      langCodes: {
        "zh-CN": "回收站记录不存在或已恢复，请刷新列表",
        "en-US":
          "The recycle-bin record is missing or already restored; refresh the list",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.staleDeletion",
      langCodes: {
        "zh-CN": "删除记录已发生变化，请刷新回收站后重试",
        "en-US":
          "This deletion has changed; refresh the recycle bin and try again",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.restoreExpired",
      langCodes: {
        "zh-CN": "记录已满 30 天，无法恢复",
        "en-US":
          "The 30-day retention period has ended; this record cannot be restored",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.stateConflict",
      langCodes: {
        "zh-CN": "部门状态或关联关系已变化，请刷新后重试",
        "en-US":
          "The department state or references changed; refresh and try again",
      },
    },
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
  "admin.system.role": [
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
  "admin.system.menu": [
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
  "admin.system.permission": [],
  "admin.system": [],
  "admin.system.api_token": [],
} satisfies Record<
  Extract<
    BusinessKey,
    | "admin.system.auth"
    | "admin.system.role_permission"
    | "admin.system.user"
    | "admin.system.department"
    | "admin.system.role"
    | "admin.system.menu"
    | "admin.system.permission"
    | "admin.system"
    | "admin.system.api_token"
  >,
  TranslationInputItem[]
>;
