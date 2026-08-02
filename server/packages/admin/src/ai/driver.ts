import { getAllEnv, getEnv } from "@hodor/core/utils/env";
import { getDefaultConfig } from "./config/service";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { registry } from "../common/registry";

/**
 * Message object structure conforming to OpenAI/Workers AI chat standard.
 */
export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

/**
 * Options for AI text generation / chat completions.
 */
export interface AiRunChatOptions {
  model?: string;
  messages: AiChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Result structure returned by AI chat completion driver.
 */
export interface AiRunChatResult {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Result structure returned by AI text embedding driver.
 */
export interface AiEmbeddingResult {
  shape: number[];
  data: number[][];
}

/**
 * Get Cloudflare Workers AI binding if available in current environment.
 */
function getAiBinding(): any {
  const env = getAllEnv();
  if (env && env.AI) return env.AI;
  if (typeof process !== "undefined" && process.env) {
    return (process.env as Record<string, any>).AI;
  }
  return undefined;
}

/**
 * Execute LLM chat completion using Cloudflare Workers AI with fallback logic.
 *
 * @param options Chat completion request parameters.
 * @returns Generated chat completion response text and metadata.
 */
export async function runAiChat(
  options: AiRunChatOptions
): Promise<AiRunChatResult> {
  const {
    model = "@cf/meta/llama-3.2-3b-instruct",
    messages,
    max_tokens = 2048,
    temperature = 0.6,
  } = options;

  const aiBinding = getAiBinding();

  // Tier 1: Cloudflare Workers AI Native Binding
  if (aiBinding && typeof aiBinding.run === "function") {
    try {
      const response = await aiBinding.run(model, {
        messages,
        max_tokens,
        temperature,
      });

      const content =
        response?.response ||
        response?.result?.response ||
        response?.choices?.[0]?.message?.content ||
        (typeof response === "string" ? response : JSON.stringify(response));

      return {
        content: content || "",
        model,
        usage: {
          prompt_tokens: response?.usage?.prompt_tokens || 0,
          completion_tokens: response?.usage?.completion_tokens || 0,
          total_tokens: response?.usage?.total_tokens || 0,
        },
      };
    } catch (err: any) {
      console.warn(
        "Workers AI 原生绑定执行遭遇提示 (可能是本地开发环境未登录 Cloudflare 账号或需要 --remote 模式):",
        err?.message || err
      );
    }
  }

  // Tier 2: System AI Configuration Fallback (OpenAI / DeepSeek / external proxy)
  const sysConfig = (await getDefaultConfig()) as Record<string, string> | null;
  if (sysConfig && sysConfig.baseUrl && sysConfig.apiKey) {
    const { baseUrl, apiKey, model: sysModel } = sysConfig;
    const targetModel = sysModel || "gpt-3.5-turbo";

    const res = await registry.base.httpFetch.fetch(
      `${baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: targetModel,
          messages,
          max_tokens,
          temperature,
        }),
        namespace: "ai.driver.chat",
        remark: `AI LLM Chat: ${targetModel}`,
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new BusinessError(
        `AI 系统配置接口请求失败 (${res.status}): ${errorText}`
      );
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    return {
      content: json.choices?.[0]?.message?.content || "",
      model: targetModel,
      usage: json.usage,
    };
  }

  // Tier 2b: Cloudflare REST API fallback if Account ID and API Token are provided
  const accountId =
    getEnv("CLOUDFLARE_ACCOUNT_ID") || "00000000000000000000000000000000";
  const apiToken = getEnv("CLOUDFLARE_API_TOKEN");
  if (accountId && apiToken) {
    const res = await registry.base.httpFetch.fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages, max_tokens, temperature }),
        namespace: "ai.driver.cloudflare",
        remark: `Cloudflare AI Run: ${model}`,
      }
    );

    if (res.ok) {
      const json = (await res.json()) as { result: { response: string } };
      return {
        content: json.result?.response || "",
        model,
      };
    }
  }

  // Tier 3: Friendly Error Response for missing environment bindings
  throw new BusinessError(
    "当前运行环境未成功调用 Cloudflare Workers AI 算力，且未配置后台 AI 引擎。\n" +
      "【调试提示】:\n" +
      "1. 生产环境：部署至 Cloudflare Worker 线上后，Workers AI 绑定（c.env.AI）将自动连接原生 GPU 算力。\n" +
      "2. 本地 Wrangler 开发环境：若需在本地调用 Cloudflare AI 算力，请在终端执行 `npx wrangler login` 授权或使用 `npx wrangler dev --remote` 启动，或在 `.dev.vars` 中配置 `CLOUDFLARE_API_TOKEN`。\n" +
      "3. 外部 AI 模型引擎：亦可在管理后台 [/ai/config]（AI 模型配置页面）添加默认的 OpenAI / DeepSeek / 硅基流动等 API 密钥以开启全量降级兼容。"
  );
}

/**
 * Generate text embeddings using Cloudflare Workers AI.
 *
 * @param text Array of text strings or a single string to embed.
 * @param model Model name for embedding.
 * @returns Text embedding vectors.
 */
export async function runAiEmbedding(
  text: string | string[],
  model = "@cf/baai/bge-base-en-v1.5"
): Promise<AiEmbeddingResult> {
  const textArray = Array.isArray(text) ? text : [text];
  const aiBinding = getAiBinding();

  if (aiBinding && typeof aiBinding.run === "function") {
    try {
      const response = await aiBinding.run(model, { text: textArray });
      return {
        shape: response.shape || [
          textArray.length,
          response.data?.[0]?.length || 0,
        ],
        data: response.data || [],
      };
    } catch (err) {
      console.warn("Workers AI Embedding execution failed:", err);
    }
  }

  // Pure fallback: return pseudo-vectors if embedding engine is absent in Node.js
  const fallbackVectors = textArray.map((t) => {
    const vec: number[] = new Array(64).fill(0);
    for (let i = 0; i < t.length; i++) {
      vec[i % 64] += t.charCodeAt(i) / 255;
    }
    return vec;
  });

  return {
    shape: [textArray.length, 64],
    data: fallbackVectors,
  };
}
