import { safeFetch } from "@hodor/core/utils/safeFetch";
import * as repository from "./repository.js";

export interface WebhookNotificationInput {
  source: string;
  text: string;
}

export interface WebhookNotificationResult {
  source: string;
  statusCode: number;
}

interface WebhookResponseBody {
  code?: number;
  msg?: string;
  StatusCode?: number;
  StatusMessage?: string;
}

function parseWebhookResponse(text: string): WebhookResponseBody | null {
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object"
      ? (value as WebhookResponseBody)
      : null;
  } catch {
    return null;
  }
}

export async function sendWebhookNotification(
  input: WebhookNotificationInput
): Promise<WebhookNotificationResult> {
  const source = input.source.trim().toLowerCase();
  const config = await repository.findPrimaryEnabledBySource(source);
  if (!config) {
    throw new Error(`未找到来源为 "${source}" 的启用主 Webhook 配置`);
  }
  if (source !== "feishu") {
    throw new Error(`暂不支持 Webhook 来源: ${source}`);
  }

  const response = await safeFetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msg_type: "text",
      content: { text: input.text.slice(0, 20_000) },
    }),
    timeoutMs: 10_000,
  });
  const responseText = (await response.text()).slice(0, 2_000);
  const responseBody = parseWebhookResponse(responseText);
  const providerCode = responseBody?.code ?? responseBody?.StatusCode;
  if (!response.ok || (providerCode !== undefined && providerCode !== 0)) {
    const providerMessage =
      responseBody?.msg ?? responseBody?.StatusMessage ?? response.statusText;
    throw new Error(
      `Webhook 通知失败: HTTP ${response.status}${providerMessage ? ` ${providerMessage}` : ""}`
    );
  }
  return { source, statusCode: response.status };
}
