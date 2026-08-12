import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { Context, UserObj } from "@hodor/core/types/app";
import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyUserContextAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { buildTaskCallbackUrl } from "../async-task/interfaces/http/callback-url.js";
import { dispatchTikTokTask } from "./facade.js";
import { TikTokTaskDispatchReqVO, TikTokTaskDispatchResVO } from "./model.js";
import { adaptTikTokTaskHttpError } from "./interfaces/http/error.js";

const dispatchReq = {
  type: "object",
  properties: TikTokTaskDispatchReqVO,
  required: ["clientId", "contractVersion", "action"],
  additionalProperties: false,
} as const satisfies JSONSchema;

const dispatchRes = {
  type: "object",
  properties: TikTokTaskDispatchResVO,
  required: [
    "taskId",
    "status",
    "traceId",
    "expiresAtUtc",
    "contractVersion",
    "action",
    "publicationId",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** 将专用 HTTP 请求适配为 canonical TikTok v2 设备任务。 */
async function onDispatch(
  params: FromSchema<typeof dispatchReq>,
  userObj: UserObj,
  context: Context
): Promise<FromSchema<typeof dispatchRes>> {
  return adaptTikTokTaskHttpError(() =>
    dispatchTikTokTask(
      {
        clientId: params.clientId,
        request: {
          contractVersion: params.contractVersion,
          action: params.action,
          publicationId: params.publicationId,
          expectedHandle: params.expectedHandle,
          media: params.media,
          content: params.content,
          policy: params.policy,
          link: params.link,
          timeout: params.timeout,
        },
        priority: params.priority,
        preemptRunning: params.preemptRunning,
        remark: params.remark,
        callbackUrl: buildTaskCallbackUrl(context.req.url),
      },
      userObj
    )
  );
}

const dispatchApi = {
  req: dispatchReq,
  res: dispatchRes,
  pathInfo: {
    path: "/v2/dispatch",
    method: "post",
    summary: "下发 TikTok v2 预检、发布、补链或状态任务",
  },
  adapter: bodyUserContextAdapter,
  service: onDispatch,
  permission: { action: "dispatch" },
} satisfies API;

export default { dispatch: dispatchApi };
