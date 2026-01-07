export const BusinessErrorCode = {
  /** @description 没有权限操作，比如超级管理员相关的，以及其他权限限制 */
  PERMISSION_DENIED: "PERMISSION_DENIED",
  /** @description 通用无效参数 */
  INVALID_PARAMS: "INVALID_PARAMS",
  /** @description 资源不存在或已被禁用 */
  NOT_EXIST_OR_DISABLED: "NOT_EXIST_OR_DISABLED",
  /** @description 菜单存在子菜单，无法删除 */
  MENU_HAS_CHILDREN: "MENU_HAS_CHILDREN",
  /** @description 部门存在子部门，无法删除 */
  DEPARTMENT_HAS_CHILDREN: "DEPARTMENT_HAS_CHILDREN",
  /** @description 未认证或登录态缺失 */
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  /** @description 认证失败（账号或密码错误等） */
  AUTH_FAILED: "AUTH_FAILED",
  /** @description 功能暂未实现 */
  NOT_YET_IMPLEMENTED: "NOT_YET_IMPLEMENTED",
  /** @description 唯一键冲突 */
  DUPLICATE_KEYS: "DUPLICATE_KEYS",
} as const;

export type BusinessErrorCode =
  (typeof BusinessErrorCode)[keyof typeof BusinessErrorCode];

// 后续可能考虑迁移到数据库或者配置文件中
export const ERROR_PRESENTATION_MAP: Record<
  BusinessErrorCode,
  {
    status: number;
    i18nKey: string;
  }
> = {
  PERMISSION_DENIED: {
    status: 403,
    i18nKey: "common.permission_denied",
  },
  INVALID_PARAMS: {
    status: 400,
    i18nKey: "common.invalid_params",
  },
  NOT_EXIST_OR_DISABLED: {
    status: 404,
    i18nKey: "i18n.api.notExistOrDisabled",
  },
  MENU_HAS_CHILDREN: {
    status: 400,
    i18nKey: "i18n.api.system.menu.hasChildren",
  },
  DEPARTMENT_HAS_CHILDREN: {
    status: 400,
    i18nKey: "i18n.api.system.department.hasChildren",
  },
  NOT_AUTHENTICATED: {
    status: 401,
    i18nKey: "i18n.api.system.notAuthenticated",
  },
  AUTH_FAILED: {
    status: 401,
    i18nKey: "i18n.api.system.authFailed",
  },
  NOT_YET_IMPLEMENTED: {
    status: 501,
    i18nKey: "i18n.api.system.wechatNotImplemented",
  },
  DUPLICATE_KEYS: {
    status: 409,
    i18nKey: "i18n.api.duplicateKeys",
  },
};
