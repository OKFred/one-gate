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
      description: "可选的图片 Base64 数据",
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
                        },
                      },
                      required: ["type", "image_url"],
                    },
                  ],
                },
              },
            ],
          },
        },
        required: ["role", "content"],
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
