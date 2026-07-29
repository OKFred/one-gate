import type { JSONSchema } from "json-schema-to-ts";
import {
  IndexVO,
  AuditVO,
  IndexKey,
  AuditKeys,
} from "@hodor/core/db/common/schema";

export { IndexVO };

//====================================================================
// AiLlmConfig PO, VO
//====================================================================

export const AiLlmConfigBasePO = {
  name: {
    type: "string",
    description: "配置名称",
    examples: ["My DeepSeek"],
    maxLength: 100,
  },
  provider: {
    type: "string",
    description: "提供商类型 (OpenAI, DeepSeek, Ollama 等)",
  },
  baseUrl: {
    type: ["string", "null"],
    nullable: true,
    description: "API 基础地址",
    examples: ["https://api.deepseek.com/v1"],
  },
  apiKey: {
    type: "string",
    description: "API 密钥",
  },
  model: {
    type: "string",
    description: "模型名称",
    examples: ["deepseek-chat"],
  },
  capabilities: {
    type: ["string", "null"],
    nullable: true,
    description: "模型支持的能力 (JSON 数组，如 ['text', 'image'])",
  },
  isEnabled: {
    type: "boolean",
    description: "是否启用",
  },
  isDefault: {
    type: "boolean",
    description: "是否为默认配置",
  },
  remark: {
    type: ["string", "null"],
    nullable: true,
    description: "备注",
    maxLength: 500,
  },
} as const satisfies Record<string, JSONSchema>;

export const AiLlmConfigVO = {
  ...IndexVO,
  ...AiLlmConfigBasePO,
  ...AuditVO,
} as const satisfies Record<string, JSONSchema>;

export const AiLlmConfigListVO = AiLlmConfigVO;

export const AiLlmConfigAddVO = {
  ...AiLlmConfigBasePO,
} as const satisfies Record<string, JSONSchema>;

export const AiLlmConfigUpdateVO = {
  ...IndexVO,
  ...AiLlmConfigBasePO,
} as const satisfies Record<string, JSONSchema>;

export const AiLlmConfigAddKeys = [
  "name",
  "provider",
  "apiKey",
  "model",
  "isEnabled",
  "isDefault",
] as const;

export const AiLlmConfigUpdateKeys = [...IndexKey] as const;

export const AiLlmConfigDeleteKeys = [...IndexKey] as const;

export const AiLlmConfigGetKeys = [...IndexKey] as const;

export const AiLlmConfigListKeys = [
  ...IndexKey,
  "name",
  "provider",
  "baseUrl",
  "apiKey",
  "model",
  "capabilities",
  "isEnabled",
  "isDefault",
  ...AuditKeys,
] as const;

export const AiLlmConfigDetailKeys = [
  ...IndexKey,
  "name",
  "provider",
  "baseUrl",
  "apiKey",
  "model",
  "capabilities",
  "isEnabled",
  "isDefault",
  "remark",
] as const;

export const AiLlmConfigSortableKeys = [
  "id",
  "name",
  "isEnabled",
  "isDefault",
  "createTimeUtc",
] as const;
