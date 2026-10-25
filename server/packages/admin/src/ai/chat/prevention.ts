import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

/**
 * AI 对话模块错误码映射
 */
export const ErrorCodes = {
  PROMPT_REQUIRED: "errorHandler.ai.chat.promptRequired",
  CONFIG_NOT_FOUND: "errorHandler.ai.chat.configNotFound",
  API_ERROR: "errorHandler.ai.chat.apiError",
  MODEL_CHANGED: "errorHandler.ai.chat.modelChanged",
  MODEL_UNAVAILABLE: "errorHandler.ai.chat.modelUnavailable",
  IMAGE_INVALID: "errorHandler.ai.chat.imageInvalid",
  IMAGE_TOO_LARGE: "errorHandler.ai.chat.imageTooLarge",
  IMAGE_LIMIT: "errorHandler.ai.chat.imageLimit",
  IMAGE_UNSUPPORTED: "errorHandler.ai.chat.imageUnsupported",
  UPSTREAM_ERROR: "errorHandler.ai.chat.upstreamError",
  UPSTREAM_INVALID: "errorHandler.ai.chat.upstreamInvalid",
} as const;

/**
 * 确保提示词不为空
 */
export const preventEmptyPrompt = (q?: string): void => {
  if (!q || !q.trim()) {
    throw new BusinessError(ErrorCodes.PROMPT_REQUIRED);
  }
};

/**
 * 确保 AI 配置存在
 */
export const preventMissingConfig = (config: unknown): void => {
  if (!config) {
    throw new BusinessError(ErrorCodes.CONFIG_NOT_FOUND);
  }
};
