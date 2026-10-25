import type { FromSchema } from "json-schema-to-ts";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { registry } from "../../common/registry";
import { CF_TEXT_MODEL, CF_VISION_MODEL, type ChatDescriptor } from "./catalog";
import type { AskReq } from "./model";
import { ErrorCodes } from "./prevention";

type ChatMessage = NonNullable<FromSchema<typeof AskReq>["history"]>[number];

function readContent(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if ("response" in value && typeof value.response === "string")
    return value.response;
  if ("result" in value) return readContent(value.result);
  if (!("choices" in value) || !Array.isArray(value.choices)) return null;
  const first: unknown = value.choices[0];
  if (!first || typeof first !== "object" || !("message" in first)) return null;
  const message = first.message;
  return message &&
    typeof message === "object" &&
    "content" in message &&
    typeof message.content === "string"
    ? message.content
    : null;
}

/** A selected request makes exactly one inference call and never falls back. */
export async function runSelectedChat(
  descriptor: ChatDescriptor,
  messages: ChatMessage[]
): Promise<string> {
  const options = {
    messages,
    max_tokens: 2048,
    temperature: 0.3,
    stream: false,
  };
  let response: unknown;
  try {
    if (descriptor.kind === "cloudflare_binding") {
      if (descriptor.model === CF_TEXT_MODEL) {
        response = await descriptor.binding.run(CF_TEXT_MODEL, {
          ...options,
          messages: messages.map((message) => ({
            role: message.role,
            content:
              typeof message.content === "string"
                ? message.content
                : message.content
                    .map((part) => (part.type === "text" ? part.text : ""))
                    .join("\n"),
          })),
        });
      } else {
        response = await descriptor.binding.run(CF_VISION_MODEL, options);
      }
    } else if (
      descriptor.kind === "openai_compatible" ||
      descriptor.kind === "cloudflare_rest"
    ) {
      const url =
        descriptor.kind === "openai_compatible"
          ? `${descriptor.baseUrl}/chat/completions`
          : `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(descriptor.accountId)}/ai/run/${descriptor.model}`;
      const result = await registry.base.httpFetch.fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${descriptor.apiKey}`,
        },
        body: JSON.stringify(
          descriptor.kind === "openai_compatible"
            ? { ...options, model: descriptor.model }
            : options
        ),
        namespace: "ai.chat.inference",
        auditMode: "metadata-only",
        remark: "AI chat inference",
        timeoutMs: 60000,
        redirect: "manual",
      });
      if (!result.ok) throw new BusinessError(ErrorCodes.UPSTREAM_ERROR);
      response = await result.json();
      if (
        response &&
        typeof response === "object" &&
        "success" in response &&
        response.success === false
      ) {
        throw new BusinessError(ErrorCodes.UPSTREAM_ERROR);
      }
    } else {
      throw new BusinessError(ErrorCodes.MODEL_UNAVAILABLE);
    }
  } catch (error) {
    if (
      error instanceof BusinessError &&
      [ErrorCodes.UPSTREAM_ERROR, ErrorCodes.MODEL_UNAVAILABLE].some(
        (code) => code === error.code
      )
    )
      throw error;
    // Provider payloads, URLs, credentials, prompts and attachments never escape.
    throw new BusinessError(ErrorCodes.UPSTREAM_ERROR);
  }
  const content = readContent(response);
  if (content === null || !content.trim())
    throw new BusinessError(ErrorCodes.UPSTREAM_INVALID);
  return content;
}
