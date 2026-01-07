export const BusinessErrorCode = {
  /** @description 没有权限操作，比如超级管理员相关的，以及其他权限限制 */
  PERMISSION_DENIED: "PERMISSION_DENIED",
  /** @description 记录未找到 */
  RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
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
  RECORD_NOT_FOUND: {
    status: 404,
    i18nKey: "user.not_found",
  },
};
