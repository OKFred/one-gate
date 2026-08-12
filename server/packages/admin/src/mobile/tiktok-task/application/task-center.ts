import {
  normalizeTikTokTaskRequest,
  TikTokContractViolation,
  type TikTokAction,
} from "../domain/contract.js";
import { TikTokTaskApplicationError } from "./error.js";
import type {
  TikTokDeviceTaskDispatcher,
  TikTokPublicationIdGenerator,
  TikTokTaskActor,
  TikTokTaskPriority,
} from "./ports.js";

/** TikTok v2 任务下发参数。 */
export interface DispatchTikTokTaskParams {
  clientId: string;
  request: unknown;
  remark?: string | null;
  callbackUrl?: string;
  priority?: TikTokTaskPriority;
  preemptRunning?: boolean;
}

/** TikTok v2 任务受理结果。 */
export interface DispatchTikTokTaskResult {
  taskId: string;
  status: "PENDING";
  traceId: string;
  expiresAtUtc: number;
  contractVersion: 2;
  action: TikTokAction;
  publicationId: string;
}

/** TikTok 任务应用服务依赖。 */
export interface TikTokTaskCenterDependencies {
  tasks: TikTokDeviceTaskDispatcher;
  publicationIds: TikTokPublicationIdGenerator;
}

/** TikTok 任务应用服务，编排 v2 契约与设备任务中心。 */
export class TikTokTaskCenter {
  constructor(private readonly dependencies: TikTokTaskCenterDependencies) {}

  /** 归一化 TikTok v2 请求并下发可信手机脚本。 */
  async dispatch(
    input: DispatchTikTokTaskParams,
    actor: TikTokTaskActor
  ): Promise<DispatchTikTokTaskResult> {
    let normalized;
    try {
      normalized = normalizeTikTokTaskRequest(input.request, () =>
        this.dependencies.publicationIds.next()
      );
    } catch (error) {
      if (error instanceof TikTokContractViolation) {
        throw new TikTokTaskApplicationError(error.message);
      }
      throw error;
    }

    const task = await this.dependencies.tasks.dispatch(
      {
        clientId: input.clientId,
        scriptId: "tiktok.post",
        params: normalized.params,
        timeoutMs: normalized.timeoutSeconds * 1000,
        remark: input.remark,
        callbackUrl: input.callbackUrl,
        priority: input.priority,
        preemptRunning: input.preemptRunning,
      },
      actor
    );

    return {
      ...task,
      contractVersion: 2,
      action: normalized.params.action,
      publicationId: normalized.params.publicationId,
    };
  }
}
