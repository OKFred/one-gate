import { BusinessError } from "@/middleware/errorHandler/businessError";

export const ErrorCodes = {
  /** 登录失败，用户名或密码错误 */
  LOGIN_FAILED: "errorHandler.loginFailed",
  /** 密码错误 */
  WRONG_PASSWORD: "errorHandler.wrongPassword",
} as const;

/**
 * 拦截登录失败（凭据错误或用户禁用）
 */
export const preventLoginFailure = (verifyResult: {
  valid: boolean;
  userObj?: { isEnabled: boolean };
}) => {
  if (
    !verifyResult ||
    !verifyResult.valid ||
    !verifyResult.userObj ||
    !verifyResult.userObj.isEnabled
  ) {
    throw new BusinessError(ErrorCodes.LOGIN_FAILED);
  }
};

/**
 * 拦截旧密码校验失败
 */
export const preventWrongPassword = (isValid: boolean) => {
  if (!isValid) {
    throw new BusinessError(ErrorCodes.WRONG_PASSWORD);
  }
};
