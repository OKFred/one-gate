import { type JSONSchema } from "json-schema-to-ts";

export const AskReq = {
  type: "object",
  properties: {
    q: {
      type: "string",
      description: "用户提问内容",
    },
    image: {
      type: "string",
      description:
        "可选 PNG/JPEG data URI，当前及历史最多一张，解码后最大 5 MiB",
    },
    modelKey: {
      type: "string",
      minLength: 1,
      description: "models 接口返回的受控模型键，配置修改后须重新选择",
    },
    history: {
      type: "array",
      items: {
        type: "object",
        properties: {
          role: { type: "string", enum: ["user", "assistant", "system"] },
          content: {
            oneOf: [
              { type: "string" },
              {
                type: "array",
                items: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        type: { type: "string", const: "text" },
                        text: { type: "string" },
                      },
                      required: ["type", "text"],
                      additionalProperties: false,
                    },
                    {
                      type: "object",
                      properties: {
                        type: { type: "string", const: "image_url" },
                        image_url: {
                          type: "object",
                          properties: {
                            url: { type: "string" },
                          },
                          required: ["url"],
                          additionalProperties: false,
                        },
                      },
                      required: ["type", "image_url"],
                      additionalProperties: false,
                    },
                  ],
                },
              },
            ],
          },
        },
        required: ["role", "content"],
        additionalProperties: false,
      },
      description: "对话上下文历史",
    },
  },
  required: ["q"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const AskRes = {
  type: "string",
  description: "AI 返回的内容",
} as const satisfies JSONSchema;

export const ModelsReq = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;

export const ChatModelVO = {
  modelKey: { type: "string" },
  label: { type: "string" },
  providerKind: {
    type: "string",
    enum: ["cloudflare", "openai_compatible"],
  },
  capabilities: {
    type: "array",
    items: { type: "string", enum: ["text", "image"] },
  },
  available: { type: "boolean" },
  unavailableReason: { type: ["string", "null"] },
  isDefault: { type: "boolean" },
} as const satisfies Record<string, JSONSchema>;

export const ModelsRes = {
  type: "object",
  properties: {
    defaultModelKey: { type: ["string", "null"] },
    models: {
      type: "array",
      items: {
        type: "object",
        properties: ChatModelVO,
        required: [
          "modelKey",
          "label",
          "providerKind",
          "capabilities",
          "available",
          "unavailableReason",
          "isDefault",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["defaultModelKey", "models"],
  additionalProperties: false,
} as const satisfies JSONSchema;
