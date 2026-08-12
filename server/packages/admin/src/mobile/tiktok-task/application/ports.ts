/** TikTok 任务使用的后台操作者最小身份。 */
export interface TikTokTaskActor {
  id: number;
  userId: number;
  username: string;
}

/** TikTok 任务调度优先级。 */
export type TikTokTaskPriority = "LOW" | "NORMAL" | "HIGH";

/** 下发到通用设备任务中心的命令。 */
export interface TikTokDeviceTaskCommand {
  clientId: string;
  scriptId: "tiktok.post";
  params: Record<string, unknown>;
  timeoutMs: number;
  remark?: string | null;
  callbackUrl?: string;
  priority?: TikTokTaskPriority;
  preemptRunning?: boolean;
}

/** 通用设备任务中心返回的受理结果。 */
export interface TikTokDeviceTaskDispatchResult {
  taskId: string;
  status: "PENDING";
  traceId: string;
  expiresAtUtc: number;
}

/** TikTok 应用层依赖的设备任务下发端口。 */
export interface TikTokDeviceTaskDispatcher {
  dispatch(
    command: TikTokDeviceTaskCommand,
    actor: TikTokTaskActor
  ): Promise<TikTokDeviceTaskDispatchResult>;
}

/** TikTok publication ID 生成端口。 */
export interface TikTokPublicationIdGenerator {
  next(): string;
}
