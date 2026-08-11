import {
  AUTOJS6_PROTOCOL_VERSION,
  DeviceTask,
  isResultPayloadWithinLimit,
  type DeviceTaskDispatchMessage,
  type DeviceTaskResultPayload,
  type MobileTaskPriority,
} from "../domain/task.js";
import {
  DeviceTaskRuleViolation,
  normalizeResultGraceMs,
  prepareTrustedTask,
  validateDeviceClientId,
  type TrustedScriptId,
} from "../domain/trusted-script.js";
import { DeviceTaskApplicationError } from "./error.js";
import type {
  Clock,
  DeviceReader,
  DeviceTaskActor,
  DeviceTaskListParams,
  DeviceTaskPage,
  DeviceTaskPublisher,
  DeviceTaskRepository,
  DeviceTaskResultHandler,
  DeviceTaskSettings,
  DeviceTaskRecord,
  IdGenerator,
} from "./ports.js";
import { DeviceTaskResultHandlerRegistry } from "./result-handler-registry.js";

/** 创建可信手机脚本任务所需参数。 */
export interface DispatchTrustedTaskParams {
  clientId: string;
  scriptId: TrustedScriptId;
  params: Record<string, unknown>;
  timeoutMs?: number;
  remark?: string | null;
  callbackUrl?: string;
  priority?: MobileTaskPriority;
  preemptRunning?: boolean;
}

/** 可信任务下发结果。 */
export interface DispatchTrustedTaskResult {
  taskId: string;
  status: "PENDING";
  traceId: string;
  expiresAtUtc: number;
}

/** 旧手机客户端回调参数。 */
export interface LegacyDeviceTaskResult {
  taskId: string;
  status: "SUCCESS" | "FAILURE" | "PROGRESS";
  message?: string;
}

/** 旧回调处理结果及原任务快照。 */
export interface LegacyDeviceTaskCompletion {
  completed: boolean;
  task: DeviceTaskRecord;
}

/** 设备任务中心的依赖集合。 */
export interface DeviceTaskCenterDependencies {
  repository: DeviceTaskRepository;
  devices: DeviceReader;
  publisher: DeviceTaskPublisher;
  clock: Clock;
  ids: IdGenerator;
  settings: DeviceTaskSettings;
  resultHandlers: DeviceTaskResultHandlerRegistry;
}

/** 设备任务应用服务，编排领域规则与外部端口。 */
export class DeviceTaskCenter {
  constructor(private readonly dependencies: DeviceTaskCenterDependencies) {}

  /** 注册或替换一个可信脚本结果后处理器。 */
  registerResultHandler(
    scriptId: TrustedScriptId,
    handler: DeviceTaskResultHandler
  ): void {
    this.dependencies.resultHandlers.register(scriptId, handler);
  }

  /** 分页查询设备任务。 */
  listTasks(params: DeviceTaskListParams): Promise<DeviceTaskPage> {
    return this.dependencies.repository.list(params);
  }

  /** 按业务任务标识读取任务。 */
  getTask(taskId: string): Promise<DeviceTaskRecord | undefined> {
    return this.dependencies.repository.getByTaskId(taskId);
  }

  /** 创建数据库任务并发布到单台设备的隔离 Topic。 */
  async dispatchTrustedTask(
    input: DispatchTrustedTaskParams,
    actor: DeviceTaskActor
  ): Promise<DispatchTrustedTaskResult> {
    try {
      validateDeviceClientId(input.clientId);
      const device = await this.dependencies.devices.getByClientId(
        input.clientId
      );
      if (!device) {
        throw new DeviceTaskApplicationError(`设备不存在: ${input.clientId}`);
      }
      if (!device.isEnabled) {
        throw new DeviceTaskApplicationError(`设备已停用: ${input.clientId}`);
      }

      const prepared = prepareTrustedTask({
        scriptId: input.scriptId,
        params: input.params,
        timeoutMs: input.timeoutMs,
        priority: input.priority,
        preemptRunning: input.preemptRunning,
        callbackUrl:
          input.callbackUrl ?? this.dependencies.settings.getCallbackUrl(),
      });
      const taskId = this.dependencies.ids.next();
      const traceId = this.dependencies.ids.next();
      const createdAt = this.dependencies.clock.now();
      const expiresAtUtc = createdAt + prepared.timeoutMs;

      await this.dependencies.repository.add({
        taskId,
        clientId: input.clientId,
        cat: "autojs6-v2",
        script: input.scriptId,
        protocolVersion: AUTOJS6_PROTOCOL_VERSION,
        scriptId: input.scriptId,
        scriptVersion: prepared.definition.version,
        paramsJson: prepared.paramsJson,
        timeoutMs: prepared.timeoutMs,
        traceId,
        priority: prepared.priority,
        preemptRunning: prepared.preemptRunning,
        preemptedByTaskId: null,
        status: "PENDING",
        resultMessage: null,
        resultCode: null,
        resultDataJson: null,
        startedAtUtc: null,
        finishedAtUtc: null,
        expiresAtUtc,
        remark: input.remark ?? null,
        creatorId: actor.id,
      });

      const message: DeviceTaskDispatchMessage = {
        protocolVersion: AUTOJS6_PROTOCOL_VERSION,
        taskId,
        deviceId: input.clientId,
        scriptId: input.scriptId,
        scriptVersion: prepared.definition.version,
        params: input.params,
        timeoutMs: prepared.timeoutMs,
        createdAt,
        expiresAt: expiresAtUtc,
        traceId,
        priority: prepared.priority,
        preemptRunning: prepared.preemptRunning,
        ...(prepared.callbackUrl ? { callbackUrl: prepared.callbackUrl } : {}),
      };

      try {
        await this.dependencies.publisher.publish(message, actor);
      } catch (error) {
        await this.dependencies.repository.completeByTaskId(
          taskId,
          input.clientId,
          {
            status: "FAILURE",
            resultCode: "MQTT_PUBLISH_FAILED",
            resultMessage:
              error instanceof Error ? error.message : String(error),
            resultDataJson: null,
            startedAtUtc: null,
            preemptedByTaskId: null,
            finishedAtUtc: this.dependencies.clock.now(),
            updaterId: actor.id,
          }
        );
        throw error;
      }

      return { taskId, status: "PENDING", traceId, expiresAtUtc };
    } catch (error) {
      if (error instanceof DeviceTaskRuleViolation) {
        throw new DeviceTaskApplicationError(error.message);
      }
      throw error;
    }
  }

  /** 幂等保存一条设备任务终态结果。 */
  async handleDeviceTaskResult(
    result: DeviceTaskResultPayload
  ): Promise<boolean> {
    const task = await this.dependencies.repository.getByTaskId(result.taskId);
    if (!task) return false;
    const completion = DeviceTask.rehydrate(task).complete(
      result,
      this.dependencies.clock.now()
    );
    if (!completion) return false;
    return this.dependencies.repository.completeByTaskId(
      result.taskId,
      result.deviceId,
      completion
    );
  }

  /** 执行领域后处理并幂等保存设备结果。 */
  async processIncomingDeviceTaskResult(
    result: DeviceTaskResultPayload
  ): Promise<boolean> {
    const task = await this.dependencies.repository.getByTaskId(result.taskId);
    if (!task || !DeviceTask.rehydrate(task).canAcceptResult(result)) {
      return false;
    }

    let resultToPersist = result;
    if (!isResultPayloadWithinLimit(result)) {
      resultToPersist = {
        ...result,
        status: "FAILURE",
        code: "RESULT_TOO_LARGE",
        message: "设备任务结果超过 1048576 字节",
        data: null,
      };
    } else {
      try {
        await this.dependencies.resultHandlers.handle(result);
      } catch (error) {
        resultToPersist = {
          ...result,
          status: "FAILURE",
          code: "SERVER_RESULT_PROCESSING_FAILED",
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    const completion = DeviceTask.rehydrate(task).complete(
      resultToPersist,
      this.dependencies.clock.now()
    );
    if (!completion) return false;
    return this.dependencies.repository.completeByTaskId(
      result.taskId,
      result.deviceId,
      completion
    );
  }

  /** 兼容旧手机客户端的设备任务结果写入。 */
  async completeLegacyDeviceTask(
    result: LegacyDeviceTaskResult
  ): Promise<LegacyDeviceTaskCompletion> {
    const task = await this.dependencies.repository.getByTaskId(result.taskId);
    if (!task) throw new DeviceTaskApplicationError("Task not found");
    if (task.status !== "PENDING" && result.status !== "PROGRESS") {
      return { completed: false, task };
    }
    if (result.status === "PROGRESS") {
      return { completed: false, task };
    }
    await this.dependencies.repository.updateLegacyResult(result.taskId, {
      status: result.status,
      resultMessage: result.message || null,
      updaterId: 0,
    });
    return { completed: true, task };
  }

  /** 将已超过服务端等待时间的任务统一置为超时。 */
  timeoutExpiredDeviceTasks(): Promise<number> {
    const resultGraceMs = normalizeResultGraceMs(
      this.dependencies.settings.getResultGraceMs()
    );
    const now = this.dependencies.clock.now();
    return this.dependencies.repository.timeoutPendingTasks(
      now - resultGraceMs,
      now
    );
  }
}
