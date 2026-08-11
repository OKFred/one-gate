import type {
  DeviceTaskCompletion,
  DeviceTaskDispatchMessage,
  DeviceTaskResultPayload,
  MobileTaskPriority,
  MobileTaskStatus,
} from "../domain/task.js";

/** 发起设备任务的审计操作者。 */
export interface DeviceTaskActor {
  id: number;
  userId: number;
  username: string;
}

/** 应用层使用的设备任务读取模型。 */
export interface DeviceTaskRecord {
  id: number;
  taskId: string;
  clientId: string;
  cat: string;
  script: string;
  protocolVersion: number | null;
  scriptId: string | null;
  scriptVersion: number | null;
  paramsJson: string | null;
  timeoutMs: number | null;
  traceId: string | null;
  priority: MobileTaskPriority;
  preemptRunning: boolean;
  preemptedByTaskId: string | null;
  status: MobileTaskStatus;
  resultMessage: string | null;
  resultCode: string | null;
  resultDataJson: string | null;
  startedAtUtc: number | null;
  finishedAtUtc: number | null;
  expiresAtUtc: number;
  remark: string | null;
  creatorId: number;
  updaterId: number | null;
  createTimeUtc: number;
  updateTimeUtc: number | null;
}

/** 新建设备任务所需持久化字段。 */
export type DeviceTaskCreateRecord = Omit<
  DeviceTaskRecord,
  "id" | "updaterId" | "createTimeUtc" | "updateTimeUtc"
>;

/** 设备任务分页查询条件。 */
export interface DeviceTaskListParams {
  pageNo: number;
  pageSize: number;
  clientId?: string;
  keyword?: string;
  status?: MobileTaskStatus;
  priority?: MobileTaskPriority;
  orderBy?: keyof DeviceTaskRecord;
  descend?: boolean;
}

/** 设备任务分页读取结果。 */
export interface DeviceTaskPage {
  list: DeviceTaskRecord[];
  total: number;
  totalPage: number;
  currentPage: number;
  pageNo: number;
  pageSize: number;
}

/** 设备任务持久化端口。 */
export interface DeviceTaskRepository {
  add(data: DeviceTaskCreateRecord): Promise<number>;
  completeByTaskId(
    taskId: string,
    clientId: string,
    data: DeviceTaskCompletion
  ): Promise<boolean>;
  getByTaskId(taskId: string): Promise<DeviceTaskRecord | undefined>;
  list(params: DeviceTaskListParams): Promise<DeviceTaskPage>;
  timeoutPendingTasks(
    deadlineCutoff: number,
    finishedAtUtc: number
  ): Promise<number>;
  updateLegacyResult(
    taskId: string,
    data: {
      status: "SUCCESS" | "FAILURE";
      resultMessage: string | null;
      updaterId: number;
    }
  ): Promise<void>;
}

/** 设备启用状态读取端口。 */
export interface DeviceReader {
  getByClientId(clientId: string): Promise<{ isEnabled: boolean } | undefined>;
}

/** 设备任务消息发布端口。 */
export interface DeviceTaskPublisher {
  publish(
    message: DeviceTaskDispatchMessage,
    actor: DeviceTaskActor
  ): Promise<void>;
}

/** 可替换的系统时间端口。 */
export interface Clock {
  now(): number;
}

/** 可替换的任务标识生成端口。 */
export interface IdGenerator {
  next(): string;
}

/** 设备任务运行配置端口。 */
export interface DeviceTaskSettings {
  getCallbackUrl(): string | undefined;
  getResultGraceMs(): unknown;
}

/** 按脚本扩展的终态结果后处理器。 */
export type DeviceTaskResultHandler = (
  result: DeviceTaskResultPayload
) => Promise<void>;
