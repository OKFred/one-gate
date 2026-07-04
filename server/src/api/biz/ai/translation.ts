import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const aiTranslations = {
  "ai.config": [
    {
      tKey: "ai.config.name",
      langCodes: {
        "zh-CN": "配置名称",
        "en-US": "Config Name",
      },
    },
    {
      tKey: "ai.config.provider",
      langCodes: {
        "zh-CN": "提供商",
        "en-US": "Provider",
      },
    },
    {
      tKey: "ai.config.baseUrl",
      langCodes: {
        "zh-CN": "接口地址",
        "en-US": "Base URL",
      },
    },
    {
      tKey: "ai.config.apiKey",
      langCodes: {
        "zh-CN": "API 密钥",
        "en-US": "API Key",
      },
    },
    {
      tKey: "ai.config.model",
      langCodes: {
        "zh-CN": "模型名称",
        "en-US": "Model",
      },
    },
    {
      tKey: "ai.config.capabilities",
      langCodes: {
        "zh-CN": "支持能力",
        "en-US": "Capabilities",
      },
    },
    {
      tKey: "ai.config.isDefault",
      langCodes: {
        "zh-CN": "设为默认",
        "en-US": "Set as Default",
      },
    },
    {
      tKey: "ai.config.verify",
      langCodes: {
        "zh-CN": "验证连通性",
        "en-US": "Verify Connectivity",
      },
    },
    {
      tKey: "ai.config.verifySuccess",
      langCodes: {
        "zh-CN": "连接验证成功",
        "en-US": "Verification successful",
      },
    },
    {
      tKey: "ai.config.verifyFailed",
      langCodes: {
        "zh-CN": "连接验证失败",
        "en-US": "Verification failed",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.config.verifyFailed",
      langCodes: {
        "zh-CN": "模型连通性验证失败: {message}",
        "en-US": "Model connectivity verification failed: {message}",
      },
    },
  ],
  "ai.chat": [
    {
      tKey: "ai.chat.inputPlaceholder",
      langCodes: {
        "zh-CN": "输入消息开始对话...",
        "en-US": "Type a message to start chat...",
      },
    },
    {
      tKey: "ai.chat.send",
      langCodes: {
        "zh-CN": "发送",
        "en-US": "Send",
      },
    },
    {
      tKey: "ai.chat.newChat",
      langCodes: {
        "zh-CN": "新建对话",
        "en-US": "New Chat",
      },
    },
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
} satisfies Record<
  Extract<BusinessKey, "ai.config" | "ai.chat">,
  TranslationInputItem[]
>;
