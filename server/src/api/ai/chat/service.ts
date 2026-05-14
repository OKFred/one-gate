import { type FromSchema } from "json-schema-to-ts";
import { getDefaultConfig } from "../config/service";
import { AskReq, AskRes } from "./model";
import { bodyAdapter } from "@/middleware/encapsulation/adapter";
import type { API } from "@/middleware/encapsulation";
import { BusinessError } from "@/middleware/errorHandler/businessError";
import {
  preventEmptyPrompt,
  preventMissingConfig,
  ErrorCodes,
} from "./prevention";

async function onAsk(
  params: FromSchema<typeof AskReq>
): Promise<FromSchema<typeof AskRes>> {
  const { q } = params;

  // 预防提示词为空
  preventEmptyPrompt(q);

  // 获取默认 AI 配置
  const config = await getDefaultConfig();
  // 预防配置缺失
  preventMissingConfig(config);

  const { baseUrl, apiKey, model } = config!;
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: q }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new BusinessError(ErrorCodes.API_ERROR, {
      status: res.status,
      message: errorText,
    });
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return json.choices[0].message.content;
}

const askApi = {
  req: AskReq,
  res: AskRes,
  pathInfo: { path: "/ask", method: "post", summary: "AI 对话接口" },
  adapter: bodyAdapter,
  service: onAsk,
  permission: { action: "read" }, // 假设登录用户即可对话
} satisfies API;

export default {
  ask: askApi,
};
