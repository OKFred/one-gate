import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const aiTranslations = {
  "admin.ai.config": [
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
  "admin.ai.chat": [
    {
      tKey: "ai.chat.subtitle",
      langCodes: {
        "zh-CN": "Cloudflare Workers AI 交互工作台",
        "en-US": "Cloudflare Workers AI Interactive Workbench",
      },
    },
    {
      tKey: "ai.chat.modelSelect",
      langCodes: {
        "zh-CN": "AI 模型引擎",
        "en-US": "AI Model Engine",
      },
    },
    {
      tKey: "ai.chat.clearHistory",
      langCodes: {
        "zh-CN": "清空对话历史",
        "en-US": "Clear Chat History",
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
      tKey: "ai.chat.user",
      langCodes: {
        "zh-CN": "您",
        "en-US": "You",
      },
    },
    {
      tKey: "ai.chat.assistant",
      langCodes: {
        "zh-CN": "Cloudflare AI",
        "en-US": "Cloudflare AI",
      },
    },
    {
      tKey: "ai.chat.thinking",
      langCodes: {
        "zh-CN": "Cloudflare Workers AI 正在思考与生成...",
        "en-US": "Cloudflare Workers AI is thinking and generating...",
      },
    },
    {
      tKey: "ai.chat.cleared",
      langCodes: {
        "zh-CN": "对话已清空。您可以开始新的问答交互！",
        "en-US": "Chat cleared. You can start a new conversation!",
      },
    },
    {
      tKey: "ai.chat.welcome",
      langCodes: {
        "zh-CN":
          "你好！我是系统内置的 Cloudflare Workers AI 智能助手。请问今天有什么我可以帮您的？",
        "en-US":
          "Hello! I am the system Cloudflare Workers AI assistant. How can I help you today?",
      },
    },
    {
      tKey: "ai.chat.inputPlaceholder",
      langCodes: {
        "zh-CN": "输入您的提问内容... (Enter 发送，Shift + Enter 换行)",
        "en-US":
          "Type your question... (Enter to send, Shift + Enter for newline)",
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
      tKey: "ai.chat.prompt1",
      langCodes: {
        "zh-CN": "简短介绍管理后台的核心功能与应用模块",
        "en-US":
          "Briefly introduce core features and modules of the admin backend",
      },
    },
    {
      tKey: "ai.chat.prompt2",
      langCodes: {
        "zh-CN": "帮助我写一个基于 Drizzle ORM 的 SQLite 查询语句",
        "en-US": "Help me write a SQLite query using Drizzle ORM",
      },
    },
    {
      tKey: "ai.chat.prompt3",
      langCodes: {
        "zh-CN": "如何配置 Cloudflare Workers AI 离线与生产运行环境？",
        "en-US":
          "How to configure Cloudflare Workers AI local and production environments?",
      },
    },
    {
      tKey: "ai.chat.prompt4",
      langCodes: {
        "zh-CN": "请总结排查生产环境 JWT 认证失败问题的步骤",
        "en-US":
          "Summarize steps to troubleshoot JWT authentication failures in production",
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
  "admin.ai.search": [
    {
      tKey: "ai.search.subtitle",
      langCodes: {
        "zh-CN": "基于 Cloudflare Workers AI 的全局语义重排序与意图检索工作台",
        "en-US":
          "Global Semantic Reranking and Intent Search Workbench powered by Cloudflare Workers AI",
      },
    },
    {
      tKey: "ai.search.placeholder",
      langCodes: {
        "zh-CN": "试着搜索: '查看系统日志' / 'AI 引擎配置' / '密码重置'...",
        "en-US":
          "Try searching: 'View System Logs' / 'AI Engine Config' / 'Password Reset'...",
      },
    },
    {
      tKey: "ai.search.btn",
      langCodes: {
        "zh-CN": "AI 搜索",
        "en-US": "AI Search",
      },
    },
    {
      tKey: "ai.search.popular",
      langCodes: {
        "zh-CN": "热门推荐:",
        "en-US": "Popular Suggestions:",
      },
    },
    {
      tKey: "ai.search.tabAll",
      langCodes: {
        "zh-CN": "全部类型",
        "en-US": "All Types",
      },
    },
    {
      tKey: "ai.search.tabMenu",
      langCodes: {
        "zh-CN": "页面导航",
        "en-US": "Navigation",
      },
    },
    {
      tKey: "ai.search.tabConfig",
      langCodes: {
        "zh-CN": "系统配置",
        "en-US": "System Config",
      },
    },
    {
      tKey: "ai.search.tabFeature",
      langCodes: {
        "zh-CN": "功能模块",
        "en-US": "Feature Modules",
      },
    },
    {
      tKey: "ai.search.tabSystem",
      langCodes: {
        "zh-CN": "运维日志",
        "en-US": "Logs & System",
      },
    },
    {
      tKey: "ai.search.searching",
      langCodes: {
        "zh-CN": "Workers AI 正在全盘索引与匹配意图...",
        "en-US": "Workers AI is indexing and matching search intent...",
      },
    },
    {
      tKey: "ai.search.notFound",
      langCodes: {
        "zh-CN": "未找到相关导航项或配置",
        "en-US": "No matching navigation items or configuration found",
      },
    },
    {
      tKey: "ai.search.jump",
      langCodes: {
        "zh-CN": "跳转直达",
        "en-US": "Jump Directly",
      },
    },
    {
      tKey: "ai.search.pathLabel",
      langCodes: {
        "zh-CN": "路径",
        "en-US": "Path",
      },
    },
    {
      tKey: "ai.search.kwViewLogs",
      langCodes: {
        "zh-CN": "查看日志",
        "en-US": "View logs",
      },
    },
    {
      tKey: "ai.search.kwAiEngine",
      langCodes: {
        "zh-CN": "AI 引擎",
        "en-US": "AI Engine",
      },
    },
    {
      tKey: "ai.search.kwCronTask",
      langCodes: {
        "zh-CN": "定时任务",
        "en-US": "Cron tasks",
      },
    },
    {
      tKey: "ai.search.kwRolePermission",
      langCodes: {
        "zh-CN": "角色权限",
        "en-US": "Roles & Permissions",
      },
    },
    {
      tKey: "ai.search.scoreLabel",
      langCodes: {
        "zh-CN": "匹配度",
        "en-US": "Score",
      },
    },
  ],
} satisfies Record<
  Extract<BusinessKey, "admin.ai.config" | "admin.ai.chat" | "admin.ai.search">,
  TranslationInputItem[]
>;
