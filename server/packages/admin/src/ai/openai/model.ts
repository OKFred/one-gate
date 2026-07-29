import { type JSONSchema } from "json-schema-to-ts";

/**
 * Value Object definition for a single message in OpenAI chat request format.
 */
export const OpenAiChatMessageVO = {
  role: {
    type: "string",
    enum: ["system", "user", "assistant"],
    description: "消息发送者角色 (system | user | assistant)",
  },
  content: {
    oneOf: [
      { type: "string", description: "文本格式消息内容" },
      {
        type: "array",
        description: "多模态混合消息内容",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "内容类型 (text | image_url)",
            },
            text: { type: "string", description: "文本内容" },
            image_url: {
              type: "object",
              description: "图片 URL 结构",
              properties: {
                url: { type: "string", description: "图片地址或 Base64 编码" },
              },
            },
          },
        },
      },
    ],
  },
} as const satisfies Record<string, JSONSchema>;

/**
 * Value Object definition for token usage stats in OpenAI chat response.
 */
export const OpenAiUsageVO = {
  prompt_tokens: { type: "integer", description: "提示词 Token 消耗数量" },
  completion_tokens: {
    type: "integer",
    description: "生成回答 Token 消耗数量",
  },
  total_tokens: { type: "integer", description: "总计 Token 消耗数量" },
} as const satisfies Record<string, JSONSchema>;

/**
 * Value Object definition for completion choice item in OpenAI chat response.
 */
export const OpenAiChatCompletionChoiceVO = {
  index: { type: "integer", description: "结果选项索引" },
  message: {
    type: "object",
    description: "生成的核心消息对象",
    properties: {
      role: {
        type: "string",
        const: "assistant",
        description: "固定为 assistant 角色",
      },
      content: { type: "string", description: "AI 生成的回答文本" },
    },
    required: ["role", "content"],
  },
  finish_reason: { type: "string", description: "结束标识 (如 stop | length)" },
} as const satisfies Record<string, JSONSchema>;

/**
 * Value Object definition for single model entry in OpenAI models list endpoint.
 */
export const OpenAiModelItemVO = {
  id: { type: "string", description: "模型 ID 名称" },
  object: { type: "string", const: "model", description: "固定为 model" },
  created: { type: "integer", description: "模型创建时间戳" },
  owned_by: { type: "string", description: "模型提供方标识" },
} as const satisfies Record<string, JSONSchema>;

/**
 * JSON Schema definition for OpenAI compatible chat completions API request.
 */
export const OpenAiChatCompletionsReq = {
  type: "object",
  properties: {
    model: {
      type: "string",
      default: "@cf/meta/llama-3.2-3b-instruct",
      description: "Cloudflare Workers AI 或 OpenAI 兼容模型名称",
    },
    messages: {
      type: "array",
      items: {
        type: "object",
        properties: OpenAiChatMessageVO,
        required: ["role", "content"],
      },
      description: "符合 OpenAI 规范的消息上下文列表",
    },
    temperature: {
      type: "number",
      default: 0.7,
      description: "生成随机性参数 (0.0 - 2.0)",
    },
    max_tokens: {
      type: "integer",
      default: 2048,
      description: "最大生成 Token 数量限制",
    },
    stream: {
      type: "boolean",
      default: false,
      description: "是否开启流式传输 (暂保留)",
    },
  },
  required: ["messages"],
  additionalProperties: true,
} as const satisfies JSONSchema;

/**
 * JSON Schema definition for OpenAI compatible chat completions API response.
 */
export const OpenAiChatCompletionsRes = {
  type: "object",
  properties: {
    id: { type: "string", description: "单次对话生成唯一标识符" },
    object: {
      type: "string",
      const: "chat.completion",
      description: "响应对象类型",
    },
    created: { type: "integer", description: "响应时间戳" },
    model: { type: "string", description: "调用的底层大语言模型名称" },
    choices: {
      type: "array",
      items: {
        type: "object",
        properties: OpenAiChatCompletionChoiceVO,
        required: ["index", "message", "finish_reason"],
      },
      description: "补全回答候选列表",
    },
    usage: {
      type: "object",
      properties: OpenAiUsageVO,
      required: ["prompt_tokens", "completion_tokens", "total_tokens"],
      description: "Token 消耗统计",
    },
  },
  required: ["id", "object", "created", "model", "choices"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * JSON Schema definition for OpenAI compatible list models API request.
 */
export const OpenAiModelsListReq = {
  type: "object",
  properties: {},
  additionalProperties: true,
} as const satisfies JSONSchema;

/**
 * JSON Schema definition for OpenAI compatible list models API response.
 */
export const OpenAiModelsListRes = {
  type: "object",
  properties: {
    object: { type: "string", const: "list", description: "固定为 list" },
    data: {
      type: "array",
      items: {
        type: "object",
        properties: OpenAiModelItemVO,
        required: ["id", "object", "created", "owned_by"],
      },
      description: "支持的 AI 模型列表",
    },
  },
  required: ["object", "data"],
  additionalProperties: false,
} as const satisfies JSONSchema;
