import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const aiTranslations = {
  "admin.ai.config": [
    {
      application: "backend",
      tKey: "errorHandler.ai.config.verifyFailed",
      langCodes: {
        "zh-CN": "模型连通性验证失败: {message}",
        "en-US": "Model connectivity verification failed: {message}",
      },
    },
  ],
  "admin.ai.chat": [
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.promptRequired",
      langCodes: {
        "zh-CN": "对话内容不能为空",
        "en-US": "Chat content cannot be empty",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.configNotFound",
      langCodes: {
        "zh-CN": "未找到默认的 AI 模型配置，请先在系统中进行设置",
        "en-US":
          "Default AI model configuration not found, please set it up in the system first",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.apiError",
      langCodes: {
        "zh-CN": "AI 接口调用失败: {message}",
        "en-US": "AI API call failed: {message}",
      },
    },
  ],
  "admin.ai.search": [],
} satisfies Record<
  Extract<BusinessKey, "admin.ai.config" | "admin.ai.chat" | "admin.ai.search">,
  TranslationInputItem[]
>;
