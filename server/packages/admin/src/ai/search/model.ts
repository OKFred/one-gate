import { type JSONSchema } from "json-schema-to-ts";

export const SearchResultItemVO = {
  id: { type: "string" },
  title: { type: "string" },
  type: { type: "string", enum: ["menu", "config", "feature", "system"] },
  path: { type: "string" },
  score: { type: "number" },
  description: { type: "string" },
  snippet: { type: "string" },
} as const satisfies Record<string, JSONSchema>;

export const SearchReq = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "搜索关键词或语义提问",
    },
    limit: {
      type: "integer",
      default: 10,
      description: "返回的最大结果数量",
    },
  },
  required: ["query"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const SearchRes = {
  type: "object",
  properties: {
    list: {
      type: "array",
      items: {
        type: "object",
        properties: SearchResultItemVO,
        required: ["id", "title", "type", "score"],
        additionalProperties: false,
      },
    },
    total: { type: "integer" },
  },
  required: ["list", "total"],
  additionalProperties: false,
} as const satisfies JSONSchema;
