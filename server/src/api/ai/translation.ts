import type { BatchTranslationItem } from "@/db/initTranslation";

export const aiTranslations: BatchTranslationItem[] = [
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "LLM 配置管理",
      "en-US": "LLM Configuration",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "配置名称",
      "en-US": "Config Name",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.provider",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提供商",
      "en-US": "Provider",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.baseUrl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口地址",
      "en-US": "Base URL",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.apiKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "API 密钥",
      "en-US": "API Key",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.model",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模型名称",
      "en-US": "Model",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.capabilities",
    isEnabled: true,
    langCodes: {
      "zh-CN": "支持能力",
      "en-US": "Capabilities",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.isDefault",
    isEnabled: true,
    langCodes: {
      "zh-CN": "设为默认",
      "en-US": "Set as Default",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.verify",
    isEnabled: true,
    langCodes: {
      "zh-CN": "验证连通性",
      "en-US": "Verify Connectivity",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.verifySuccess",
    isEnabled: true,
    langCodes: {
      "zh-CN": "连接验证成功",
      "en-US": "Verification successful",
    },
  },
  {
    application: "frontend",
    business: "ai.config",
    tKey: "ai.config.verifyFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "连接验证失败",
      "en-US": "Verification failed",
    },
  },
  {
    application: "backend",
    business: "ai.config",
    tKey: "errorHandler.ai.config.verifyFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "模型连通性验证失败: {message}",
      "en-US": "Model connectivity verification failed: {message}",
    },
  },
  {
    application: "frontend",
    business: "ai.chat",
    tKey: "ai.chat.inputPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入消息开始对话...",
      "en-US": "Type a message to start chat...",
    },
  },
  {
    application: "frontend",
    business: "ai.chat",
    tKey: "ai.chat.send",
    isEnabled: true,
    langCodes: {
      "zh-CN": "发送",
      "en-US": "Send",
    },
  },
  {
    application: "frontend",
    business: "ai.chat",
    tKey: "ai.chat.newChat",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新建对话",
      "en-US": "New Chat",
    },
  },
  {
    application: "backend",
    business: "ai.chat",
    tKey: "errorHandler.ai.chat.promptRequired",
    isEnabled: true,
    langCodes: {
      "zh-CN": "对话内容不能为空",
      "en-US": "Chat content cannot be empty",
    },
  },
  {
    application: "backend",
    business: "ai.chat",
    tKey: "errorHandler.ai.chat.configNotFound",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未找到默认的 AI 模型配置，请先在系统中进行设置",
      "en-US":
        "Default AI model configuration not found, please set it up in the system first",
    },
  },
  {
    application: "backend",
    business: "ai.chat",
    tKey: "errorHandler.ai.chat.apiError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "AI 接口调用失败: {message}",
      "en-US": "AI API call failed: {message}",
    },
  },
];
