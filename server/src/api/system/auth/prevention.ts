import {
  BusinessError,
  BusinessErrorCode,
} from "@/middleware/errorHandler/businessError";

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
    throw new BusinessError(BusinessErrorCode.LOGIN_FAILED);
  }
};

/**
 * 拦截旧密码校验失败
 */
export const preventWrongPassword = (isValid: boolean) => {
  if (!isValid) {
    throw new BusinessError(BusinessErrorCode.WRONG_PASSWORD);
  }
};

/**
 * 拦截未授权/Token无效状态
 */
export const preventUnauthenticated = (condition: any) => {
  if (!condition) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  }
};
