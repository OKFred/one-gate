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
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.modelChanged",
      langCodes: {
        "zh-CN": "模型配置已变更或不可用，请刷新模型列表后重试",
        "en-US":
          "The model configuration changed or is unavailable. Refresh the model list and retry.",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.modelUnavailable",
      langCodes: {
        "zh-CN": "所选模型尚未配置完成，请选择可用模型",
        "en-US":
          "The selected model is not configured. Select an available model.",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.imageInvalid",
      langCodes: {
        "zh-CN": "图片必须是文件类型匹配的 PNG/JPEG Base64 data URI",
        "en-US":
          "Use a PNG/JPEG Base64 data URI whose file signature matches its type.",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.imageTooLarge",
      langCodes: {
        "zh-CN": "图片解码后不能超过 5 MiB",
        "en-US": "The decoded image must not exceed 5 MiB.",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.imageLimit",
      langCodes: {
        "zh-CN": "当前问题和历史记录合计最多一张图片，换图请新建对话",
        "en-US":
          "The question and history may contain one image in total. Start a new chat to change images.",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.imageUnsupported",
      langCodes: {
        "zh-CN": "所选模型不支持图片，请选择视觉模型",
        "en-US":
          "The selected model does not support images. Select a vision model.",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.upstreamError",
      langCodes: {
        "zh-CN": "所选模型请求失败，请稍后重试",
        "en-US": "The selected model request failed. Retry later.",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.ai.chat.upstreamInvalid",
      langCodes: {
        "zh-CN": "所选模型未返回有效回答，请稍后重试",
        "en-US": "The selected model returned no valid answer. Retry later.",
      },
    },
  ],
  "admin.ai.search": [],
} satisfies Record<
  Extract<BusinessKey, "admin.ai.config" | "admin.ai.chat" | "admin.ai.search">,
  TranslationInputItem[]
>;
