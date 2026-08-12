import { tiktokTaskCenter } from "./infrastructure/container.js";
import type { TikTokTaskActor } from "./application/ports.js";
import type {
  DispatchTikTokTaskParams,
  DispatchTikTokTaskResult,
} from "./application/task-center.js";

export type {
  TikTokAction,
  TikTokContentContract,
  TikTokLinkContract,
  TikTokMediaContract,
  TikTokMediaKind,
  TikTokPolicyContract,
  TikTokTaskContract,
} from "./domain/contract.js";
export {
  DEFAULT_TIKTOK_LINK,
  DEFAULT_TIKTOK_POLICY,
  TIKTOK_ACTIONS,
  TIKTOK_MEDIA_KINDS,
} from "./domain/contract.js";
export type {
  DispatchTikTokTaskParams,
  DispatchTikTokTaskResult,
} from "./application/task-center.js";

/** 下发一条 canonical TikTok v2 设备任务。 */
export const dispatchTikTokTask: (
  input: DispatchTikTokTaskParams,
  actor: TikTokTaskActor
) => Promise<DispatchTikTokTaskResult> =
  tiktokTaskCenter.dispatch.bind(tiktokTaskCenter);
