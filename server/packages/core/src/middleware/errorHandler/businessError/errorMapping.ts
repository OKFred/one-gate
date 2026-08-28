export const BusinessErrorCode = {
  /** @description 无效参数 */
  INVALID_PARAMS: "INVALID_PARAMS",
  /** @description 未认证或登录态缺失 */
  NOT_AUTHENTICATED: "NOT_AUTHENTICATED",
  /** @description 没有权限操作 */
  PERMISSION_DENIED: "PERMISSION_DENIED",
  /** @description 资源不存在或已被禁用 */
  NOT_EXIST_OR_DISABLED: "NOT_EXIST_OR_DISABLED",
  /** @description 数据重复 */
  DUPLICATE_DATA: "DUPLICATE_DATA",
  /** @description 数据验证失败 */
  VALIDATION_FAILED: "VALIDATION_FAILED",
  /** @description 功能暂未实现 */
  NOT_YET_IMPLEMENTED: "NOT_YET_IMPLEMENTED",
  /** @description 未知错误 */
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  /** @description 数据库繁忙或锁定 */
  DATABASE_BUSY: "DATABASE_BUSY",
  /** @description 数据库操作错误 */
  DATABASE_ERROR: "DATABASE_ERROR",
  /** @description Docker API 调用错误 */
  DOCKER_API_ERROR: "DOCKER_API_ERROR",
  /** @description 尚未完成 TOTP 二次门禁 */
  TOTP_GATE_REQUIRED: "TOTP_GATE_REQUIRED",
  /** @description TOTP 验证码错误、过期或已消费 */
  TOTP_CODE_INVALID: "TOTP_CODE_INVALID",
  /** @description TOTP 验证过于频繁 */
  TOTP_GATE_RATE_LIMITED: "TOTP_GATE_RATE_LIMITED",
  /** @description TOTP 门禁配置或协调器不可用 */
  TOTP_GATE_UNAVAILABLE: "TOTP_GATE_UNAVAILABLE",
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
  INVALID_PARAMS: {
    status: 400,
    i18nKey: "errorHandler.invalidParams",
  },
  NOT_AUTHENTICATED: {
    status: 401,
    i18nKey: "errorHandler.notAuthenticated",
  },
  PERMISSION_DENIED: {
    status: 403,
    i18nKey: "errorHandler.permissionDenied",
  },
  NOT_EXIST_OR_DISABLED: {
    status: 404,
    i18nKey: "errorHandler.notExistOrDisabled",
  },
  DUPLICATE_DATA: {
    status: 409,
    i18nKey: "errorHandler.duplicatedData",
  },
  VALIDATION_FAILED: {
    status: 422,
    i18nKey: "errorHandler.validationFailed",
  },
  UNKNOWN_ERROR: {
    status: 500,
    i18nKey: "errorHandler.unknownError",
  },
  NOT_YET_IMPLEMENTED: {
    status: 501,
    i18nKey: "errorHandler.notYetImplemented",
  },
  DATABASE_BUSY: {
    status: 503,
    i18nKey: "errorHandler.databaseBusy",
  },
  DATABASE_ERROR: {
    status: 500,
    i18nKey: "errorHandler.databaseError",
  },
  DOCKER_API_ERROR: {
    status: 502,
    i18nKey: "errorHandler.dockerApiError",
  },
  TOTP_GATE_REQUIRED: {
    status: 401,
    i18nKey: "errorHandler.totpGateRequired",
  },
  TOTP_CODE_INVALID: {
    status: 401,
    i18nKey: "errorHandler.totpCodeInvalid",
  },
  TOTP_GATE_RATE_LIMITED: {
    status: 429,
    i18nKey: "errorHandler.totpGateRateLimited",
  },
  TOTP_GATE_UNAVAILABLE: {
    status: 503,
    i18nKey: "errorHandler.totpGateUnavailable",
  },
};
