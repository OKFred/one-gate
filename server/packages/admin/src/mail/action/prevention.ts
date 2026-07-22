import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError/index.js";

/**
 * 邮件操作模块错误码映射
 */
export const ErrorCodes = {
  SEND_FAILED: "errorHandler.mail.action.sendFailed",
} as const;

/**
 * 校验发送状态
 */
export const preventSendFailure = (sendStatus: boolean, details?: string) => {
  if (!sendStatus) {
    throw new BusinessError(ErrorCodes.SEND_FAILED, { details });
  }
};
