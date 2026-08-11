/** AutoJS6 设备任务协议版本。 */
export const AUTOJS6_PROTOCOL_VERSION = 2 as const;

/** 手机任务调度优先级。 */
export const MOBILE_TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;
export type MobileTaskPriority = (typeof MOBILE_TASK_PRIORITIES)[number];

/** 设备任务完整状态集合。 */
export const MOBILE_TASK_STATUSES = [
  "PENDING",
  "RUNNING",
  "SUCCESS",
  "FAILURE",
  "TIMEOUT",
  "REJECTED",
  "CANCELLED",
] as const;
export type MobileTaskStatus = (typeof MOBILE_TASK_STATUSES)[number];

/** 设备任务终态集合。 */
export const MOBILE_TASK_TERMINAL_STATUSES = [
  "SUCCESS",
  "FAILURE",
  "TIMEOUT",
  "REJECTED",
  "CANCELLED",
] as const;
export type MobileTaskTerminalStatus =
  (typeof MOBILE_TASK_TERMINAL_STATUSES)[number];

/** 服务端可接收设备终态的活动状态。 */
const ACTIVE_TASK_STATUSES: readonly MobileTaskStatus[] = [
  "PENDING",
  "RUNNING",
];

/** 设备上报的 v2 统一任务结果。 */
export interface DeviceTaskResultPayload {
  protocolVersion: 2;
  taskId: string;
  deviceId: string;
  scriptId: string;
  status: MobileTaskTerminalStatus;
  code: string;
  message: string;
  data: unknown;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  traceId: string;
}

/** 下发到 AutoJS6 设备隔离 Topic 的消息。 */
export interface DeviceTaskDispatchMessage {
  protocolVersion: 2;
  taskId: string;
  deviceId: string;
  scriptId: string;
  scriptVersion: number;
  params: Record<string, unknown>;
  timeoutMs: number;
  createdAt: number;
  expiresAt: number;
  traceId: string;
  priority: MobileTaskPriority;
  preemptRunning: boolean;
  callbackUrl?: string;
}

/** 重新装载任务聚合所需的最小快照。 */
export interface DeviceTaskSnapshot {
  taskId: string;
  clientId: string;
  protocolVersion: number | null;
  scriptId: string | null;
  traceId: string | null;
  status: MobileTaskStatus;
}

/** 写入任务终态所需字段。 */
export interface DeviceTaskCompletion {
  status: MobileTaskTerminalStatus;
  resultCode: string;
  resultMessage: string | null;
  resultDataJson: string | null;
  preemptedByTaskId: string | null;
  startedAtUtc: number | null;
  finishedAtUtc: number;
  updaterId: number;
}

/** 表达设备任务身份与状态转换规则的聚合。 */
export class DeviceTask {
  private constructor(private readonly snapshot: DeviceTaskSnapshot) {}

  /** 从持久化快照恢复任务聚合。 */
  static rehydrate(snapshot: DeviceTaskSnapshot): DeviceTask {
    return new DeviceTask(snapshot);
  }

  /** 判断结果身份是否属于当前任务。 */
  matchesResult(result: DeviceTaskResultPayload): boolean {
    return (
      result.protocolVersion === AUTOJS6_PROTOCOL_VERSION &&
      this.snapshot.protocolVersion === AUTOJS6_PROTOCOL_VERSION &&
      this.snapshot.taskId === result.taskId &&
      this.snapshot.clientId === result.deviceId &&
      this.snapshot.scriptId === result.scriptId &&
      this.snapshot.traceId === result.traceId
    );
  }

  /** 判断当前任务是否允许首次接收终态结果。 */
  canAcceptResult(result: DeviceTaskResultPayload): boolean {
    return (
      this.matchesResult(result) &&
      ACTIVE_TASK_STATUSES.includes(this.snapshot.status)
    );
  }

  /** 将合法设备结果转换为持久化终态。 */
  complete(
    result: DeviceTaskResultPayload,
    fallbackFinishedAt: number
  ): DeviceTaskCompletion | null {
    if (!this.canAcceptResult(result)) return null;
    return {
      status: result.status,
      resultCode: result.code,
      resultMessage: result.message || null,
      resultDataJson: JSON.stringify(result.data ?? null),
      preemptedByTaskId: extractPreemptedByTaskId(result),
      startedAtUtc: Number.isFinite(result.startedAt) ? result.startedAt : null,
      finishedAtUtc: Number.isFinite(result.finishedAt)
        ? result.finishedAt
        : fallbackFinishedAt,
      updaterId: 0,
    };
  }
}

/** 从抢占取消结果中提取发起抢占的任务标识。 */
export function extractPreemptedByTaskId(
  result: DeviceTaskResultPayload
): string | null {
  if (
    result.status !== "CANCELLED" ||
    typeof result.data !== "object" ||
    result.data === null ||
    Array.isArray(result.data)
  ) {
    return null;
  }
  const value = (result.data as Record<string, unknown>).preemptedByTaskId;
  return typeof value === "string" ? value : null;
}

/** 判断序列化结果是否位于允许的字节数内。 */
export function isResultPayloadWithinLimit(
  result: DeviceTaskResultPayload,
  maxBytes = 1_048_576
): boolean {
  return (
    new TextEncoder().encode(JSON.stringify(result)).byteLength <= maxBytes
  );
}
