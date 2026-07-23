import { type FromSchema } from "json-schema-to-ts";
import {
  OpenAiChatCompletionsReq,
  OpenAiChatCompletionsRes,
  OpenAiModelsListReq,
  OpenAiModelsListRes,
} from "./model";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { runAiChat, type AiChatMessage } from "../driver";

/**
 * Available Cloudflare Workers AI models list exposed via OpenAI models endpoint.
 */
const SUPPORTED_CF_MODELS = [
  {
    id: "@cf/meta/llama-3.3-70b-instruct",
    created: 1720000000,
    owned_by: "cloudflare",
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    created: 1720000000,
    owned_by: "cloudflare",
  },
  {
    id: "@cf/qwen/qwen2.5-7b-instruct",
    created: 1720000000,
    owned_by: "cloudflare",
  },
  {
    id: "@cf/meta/llama-3.2-3b-instruct",
    created: 1720000000,
    owned_by: "cloudflare",
  },
  {
    id: "@cf/baai/bge-base-en-v1.5",
    created: 1720000000,
    owned_by: "cloudflare",
  },
];

/**
 * OpenAI compatible chat completions endpoint handler.
 */
async function onChatCompletions(
  params: FromSchema<typeof OpenAiChatCompletionsReq>
): Promise<FromSchema<typeof OpenAiChatCompletionsRes>> {
  const {
    model = "@cf/meta/llama-3.2-3b-instruct",
    messages,
    temperature = 0.7,
    max_tokens = 2048,
  } = params;

  const formattedMessages: AiChatMessage[] = messages.map((m) => ({
    role: m.role as "system" | "user" | "assistant",
    content: m.content as any,
  }));

  const result = await runAiChat({
    model,
    messages: formattedMessages,
    temperature,
    max_tokens,
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const completionId = `chatcmpl-${Math.random().toString(36).substring(2, 11)}`;

  return {
    id: completionId,
    object: "chat.completion",
    created: timestamp,
    model: result.model || model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: result.content,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: result.usage?.prompt_tokens || 10,
      completion_tokens: result.usage?.completion_tokens || 20,
      total_tokens: result.usage?.total_tokens || 30,
    },
  };
}

/**
 * OpenAI compatible models list endpoint handler.
 */
async function onListModels(
  _params: FromSchema<typeof OpenAiModelsListReq>
): Promise<FromSchema<typeof OpenAiModelsListRes>> {
  return {
    object: "list",
    data: SUPPORTED_CF_MODELS.map((m) => ({
      id: m.id,
      object: "model" as const,
      created: m.created,
      owned_by: m.owned_by,
    })),
  };
}

const completionsApi = {
  req: OpenAiChatCompletionsReq,
  res: OpenAiChatCompletionsRes,
  pathInfo: {
    path: "/chat/completions",
    method: "post",
    summary: "OpenAI 兼容对话补全",
  },
  adapter: bodyAdapter,
  service: onChatCompletions,
  permission: { action: "read" },
} satisfies API;

const modelsApi = {
  req: OpenAiModelsListReq,
  res: OpenAiModelsListRes,
  pathInfo: { path: "/models", method: "post", summary: "OpenAI 兼容模型列表" },
  adapter: bodyAdapter,
  service: onListModels,
  permission: { action: "read" },
} satisfies API;

export default {
  completions: completionsApi,
  models: modelsApi,
};
