export const BusinessErrorCode = {
  /** @description 存在子节点，请检查后重试 */
  HAS_CHILDREN: "HAS_CHILDREN",
  /** @description 没有权限操作，比如超级管理员相关的，以及其他权限限制 */
  INVALID_PARAMS: "INVALID_PARAMS",
  /** @description 未认证或登录态缺失 */
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  /** @description 资源不存在或已被禁用 */
  PERMISSION_DENIED: "PERMISSION_DENIED",
  /** @description 通用无效参数 */
  NOT_EXIST_OR_DISABLED: "NOT_EXIST_OR_DISABLED",
  /** @description 唯一键冲突 */
  DUPLICATE_KEYS: "DUPLICATE_KEYS",
  /** @description 功能暂未实现 */
  NOT_YET_IMPLEMENTED: "NOT_YET_IMPLEMENTED",
} as const;

export type BusinessErrorCode =
  (typeof BusinessErrorCode)[keyof typeof BusinessErrorCode];

// 后续可能考虑迁移到数据库或者配置文件中
export const ERROR_PRESENTATION_MAP: Record<
  BusinessErrorCode,
  {
    status?: number;
    i18nKey: string;
  }
> = {
  HAS_CHILDREN: {
    i18nKey: "i18n.api.system.hasChildren",
  },
  INVALID_PARAMS: {
    status: 400,
    i18nKey: "common.invalid_params",
  },
  NOT_AUTHENTICATED: {
    status: 401,
    i18nKey: "i18n.api.system.notAuthenticated",
  },
  PERMISSION_DENIED: {
    status: 403,
    i18nKey: "common.permission_denied",
  },
  NOT_EXIST_OR_DISABLED: {
    status: 404,
    i18nKey: "i18n.api.notExistOrDisabled",
  },
  DUPLICATE_KEYS: {
    status: 409,
    i18nKey: "i18n.api.duplicateKeys",
  },
  NOT_YET_IMPLEMENTED: {
    status: 501,
    i18nKey: "i18n.api.system.wechatNotImplemented",
  },
};
