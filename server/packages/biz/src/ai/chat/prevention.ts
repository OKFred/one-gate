import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";

/**
 * AI 对话模块错误码映射
 */
export const ErrorCodes = {
  PROMPT_REQUIRED: "errorHandler.ai.chat.promptRequired",
  CONFIG_NOT_FOUND: "errorHandler.ai.chat.configNotFound",
  API_ERROR: "errorHandler.ai.chat.apiError",
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
export const preventMissingConfig = (config: any): void => {
  if (!config) {
    throw new BusinessError(ErrorCodes.CONFIG_NOT_FOUND);
  }
};
