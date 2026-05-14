import { BusinessError } from "@/middleware/errorHandler/businessError";

/**
 * AI 配置模块错误码映射
 */
export const ErrorCodes = {
  VERIFY_FAILED: "errorHandler.ai.config.verifyFailed",
} as const;

/**
 * 确保配置验证成功
 */
export const preventVerifyFailure = (success: boolean): void => {
  if (!success) {
    throw new BusinessError(ErrorCodes.VERIFY_FAILED);
  }
};
