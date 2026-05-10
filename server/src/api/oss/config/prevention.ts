import { BusinessError } from "@/middleware/errorHandler/businessError";

/**
 * 存储配置模块错误码映射
 */
export const ErrorCodes = {
  INIT_FAILED: "errorHandler.oss.config.initFailed",
} as const;

/**
 * 确保存储实例能够成功初始化
 */
export const preventStorageInitFailure = (storage: any): void => {
  if (!storage) {
    throw new BusinessError(ErrorCodes.INIT_FAILED);
  }
};
