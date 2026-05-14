import { type JSONSchema } from "json-schema-to-ts";

export const AskReq = {
  type: "object",
  properties: {
    q: {
      type: "string",
      description: "用户提问内容",
    },
  },
  required: ["q"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const AskRes = {
  type: "string",
  description: "AI 返回的内容",
} as const satisfies JSONSchema;
