import { type FromSchema } from "json-schema-to-ts";
import { getDefaultConfig } from "../config/service";
import { AskReq, AskRes } from "./model";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import {
  preventEmptyPrompt,
  preventMissingConfig,
  ErrorCodes,
} from "./prevention";

async function onAsk(
  params: FromSchema<typeof AskReq>
): Promise<FromSchema<typeof AskRes>> {
  const { q, image, history = [] } = params;

  // 预防提示词为空
  preventEmptyPrompt(q);

  // 获取默认 AI 配置
  const config = await getDefaultConfig();
  // 预防配置缺失
  preventMissingConfig(config);

  const { baseUrl, apiKey, model } = config as unknown as Record<
    string,
    string
  >;

  // 1. 构造系统指令消息
  const systemMessage = {
    role: "system",
    content:
      "Do not overthink. Keep reasoning short. Answer directly. Use tools quickly.",
  };

  // 2. 构造用户内容
  const userContent = image
    ? [
        { type: "text", text: q },
        { type: "image_url", image_url: { url: image } },
      ]
    : q;

  // 3. 组装最终消息流
  const finalMessages = [
    ...history,
    systemMessage,
    { role: "user", content: userContent },
  ];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      max_tokens: 4096,
      reasoning_effort: "low",
      temperature: 0.2,
      tool_ids: ["server:chrome-devtools-mcp", "server:mcp-time"],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`AI API Error [${res.status}]:`, errorBody);
    throw new Error(`AI API 响应错误 (${res.status})`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  console.log(json);
  return json.choices[0].message.content;
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
