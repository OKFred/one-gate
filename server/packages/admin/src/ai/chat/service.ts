import { type FromSchema } from "json-schema-to-ts";
import { AskReq, AskRes } from "./model";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { preventEmptyPrompt } from "./prevention";
import { runAiChat, type AiChatMessage } from "../driver";

/**
 * Handle AI chat completions using Workers AI driver with system configuration fallback.
 */
async function onAsk(
  params: FromSchema<typeof AskReq>
): Promise<FromSchema<typeof AskRes>> {
  const { q, image, history = [] } = params;

  // 预防提示词为空
  preventEmptyPrompt(q);

  // 1. 构造系统指令消息
  const systemMessage: AiChatMessage = {
    role: "system",
    content: "你是一个智能高效的 AI 助手，请准确、简洁、专业的回答用户的问题。",
  };

  // 2. 构造用户内容
  const userContent = image
    ? [
        { type: "text", text: q },
        { type: "image_url", image_url: { url: image } },
      ]
    : q;

  // 3. 组装历史与当前消息
  const formattedHistory: AiChatMessage[] = history.map((item) => ({
    role: item.role as "user" | "assistant" | "system",
    content: item.content as AiChatMessage["content"],
  }));

  const finalMessages: AiChatMessage[] = [
    systemMessage,
    ...formattedHistory,
    { role: "user", content: userContent },
  ];

  const result = await runAiChat({
    model: "@cf/meta/llama-3.2-3b-instruct",
    messages: finalMessages,
    temperature: 0.3,
  });

  return result.content;
}

const askApi = {
  req: AskReq,
  res: AskRes,
  pathInfo: { path: "/ask", method: "post", summary: "AI 对话接口" },
  adapter: bodyAdapter,
  service: onAsk,
  permission: { action: "read" },
} satisfies API;

export default {
  ask: askApi,
};
