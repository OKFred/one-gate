import type { JSONSchema } from "json-schema-to-ts";
import { MOBILE_TASK_PRIORITIES } from "../async-task/domain/task.js";
import { TIKTOK_ACTIONS, TIKTOK_MEDIA_KINDS } from "./domain/contract.js";

/** TikTok v2 媒体参数 Schema。 */
export const TikTokMediaVO = {
  type: "object",
  properties: {
    mode: { type: "string", enum: ["direct", "pool"] },
    kind: { type: "string", enum: TIKTOK_MEDIA_KINDS },
    path: { type: "string", minLength: 1, maxLength: 1024 },
    paths: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 1024 },
    },
    directory: { type: "string", minLength: 1, maxLength: 1024 },
  },
  required: ["mode", "kind"],
  additionalProperties: false,
} as const satisfies JSONSchema;

/** TikTok v2 文案参数 Schema。 */
export const TikTokContentVO = {
  type: "object",
  properties: {
    title: { type: "string", maxLength: 90 },
    details: { type: "string", maxLength: 4000 },
    titles: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 90 },
    },
    detailsPool: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 4000 },
    },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

/** TikTok v2 频率保护参数 Schema。 */
export const TikTokPolicyVO = {
  type: "object",
  properties: {
    minIntervalSeconds: {
      type: "integer",
      minimum: 1,
      maximum: 86_400,
      description: "最小发布间隔；手机端本地策略可进一步收紧",
    },
    maxPostsPerDay: {
      type: "integer",
      minimum: 1,
      maximum: 100,
      description: "每日发布上限；手机端本地策略可进一步收紧",
    },
    materialReuseSeconds: {
      type: "integer",
      minimum: 0,
      maximum: 2_592_000,
    },
    captionReuseSeconds: {
      type: "integer",
      minimum: 0,
      maximum: 2_592_000,
    },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

/** TikTok v2 链接重试参数 Schema。 */
export const TikTokLinkVO = {
  type: "object",
  properties: {
    maxAttempts: { type: "integer", minimum: 1, maximum: 20 },
    retrySeconds: { type: "integer", minimum: 2, maximum: 60 },
  },
  additionalProperties: false,
} as const satisfies JSONSchema;

/** TikTok v2 专用下发请求字段。 */
export const TikTokTaskDispatchReqVO = {
  clientId: { type: "string", minLength: 1, maxLength: 100 },
  contractVersion: { type: "integer", enum: [2] },
  action: { type: "string", enum: TIKTOK_ACTIONS },
  publicationId: {
    type: "string",
    pattern:
      "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    description: "publish/preflight 可省略；recover/status 必须复用原 UUID",
  },
  expectedHandle: { type: "string", minLength: 2, maxLength: 25 },
  media: TikTokMediaVO,
  content: TikTokContentVO,
  policy: TikTokPolicyVO,
  link: TikTokLinkVO,
  timeout: {
    type: "integer",
    minimum: 120,
    maximum: 600,
    description: "手机端任务超时秒数，默认 420",
  },
  priority: {
    type: "string",
    enum: MOBILE_TASK_PRIORITIES,
    description: "可选任务优先级，默认 NORMAL",
  },
  preemptRunning: {
    type: "boolean",
    description: "是否抢占同级或更低优先级运行任务，默认 false",
  },
  remark: { type: ["string", "null"], nullable: true, maxLength: 500 },
} as const satisfies Record<string, JSONSchema>;

/** TikTok v2 专用下发响应字段。 */
export const TikTokTaskDispatchResVO = {
  taskId: { type: "string" },
  status: { type: "string", enum: ["PENDING"] },
  traceId: { type: "string" },
  expiresAtUtc: { type: "integer" },
  contractVersion: { type: "integer", enum: [2] },
  action: { type: "string", enum: TIKTOK_ACTIONS },
  publicationId: { type: "string" },
} as const satisfies Record<string, JSONSchema>;
