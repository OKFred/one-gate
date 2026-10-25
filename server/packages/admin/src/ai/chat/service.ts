import { type FromSchema } from "json-schema-to-ts";
import { AskReq, AskRes, ModelsReq, ModelsRes } from "./model";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import type { API } from "@hodor/core/middleware/encapsulation";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { ErrorCodes, preventEmptyPrompt } from "./prevention";
import { loadChatCatalog, selectChatDescriptor } from "./catalog";
import { validateChatAttachments } from "./attachments";
import { runSelectedChat } from "./provider";

/**
 * Preserve the string response contract with one server-selected provider call.
 */
async function onAsk(
  params: FromSchema<typeof AskReq>
): Promise<FromSchema<typeof AskRes>> {
  preventEmptyPrompt(params.q);
  const hasImage = validateChatAttachments(params);
  const { catalog, descriptors } = await loadChatCatalog();
  const descriptor = selectChatDescriptor(
    descriptors,
    catalog.defaultModelKey,
    params.modelKey
  );
  if (hasImage && !descriptor.item.capabilities.includes("image")) {
    throw new BusinessError(ErrorCodes.IMAGE_UNSUPPORTED);
  }
  return runSelectedChat(descriptor, [
    {
      role: "system",
      content:
        "你是一个智能高效的 AI 助手，请准确、简洁、专业的回答用户的问题。",
    },
    ...(params.history ?? []),
    {
      role: "user",
      content: params.image
        ? [
            { type: "text", text: params.q },
            { type: "image_url", image_url: { url: params.image } },
          ]
        : params.q,
    },
  ]);
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
  models: {
    req: ModelsReq,
    res: ModelsRes,
    pathInfo: { path: "/models", method: "post", summary: "获取可用聊天模型" },
    adapter: bodyAdapter,
    service: async (
      _params: FromSchema<typeof ModelsReq>
    ): Promise<FromSchema<typeof ModelsRes>> =>
      (await loadChatCatalog()).catalog,
    permission: { action: "read" },
  } satisfies API,
};
