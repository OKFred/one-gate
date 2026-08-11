import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DeviceTaskCompletion,
  DeviceTaskDispatchMessage,
  DeviceTaskResultPayload,
} from "../domain/task.js";
import type {
  Clock,
  DeviceReader,
  DeviceTaskActor,
  DeviceTaskCreateRecord,
  DeviceTaskListParams,
  DeviceTaskPage,
  DeviceTaskPublisher,
  DeviceTaskRecord,
  DeviceTaskRepository,
  DeviceTaskSettings,
  IdGenerator,
} from "./ports.js";
import { DeviceTaskResultHandlerRegistry } from "./result-handler-registry.js";
import { DeviceTaskCenter } from "./task-center.js";

const actor: DeviceTaskActor = {
  id: 42,
  userId: 42,
  username: "tester",
};

function createTask(
  overrides: Partial<DeviceTaskRecord> = {}
): DeviceTaskRecord {
  return {
    id: 1,
    taskId: "task-12345678",
    clientId: "device-01",
    cat: "autojs6-v2",
    script: "device.apps.list",
    protocolVersion: 2,
    scriptId: "device.apps.list",
    scriptVersion: 1,
    paramsJson: "{}",
    timeoutMs: 120_000,
    traceId: "trace-12345678",
    priority: "NORMAL",
    preemptRunning: false,
    preemptedByTaskId: null,
    status: "PENDING",
    resultMessage: null,
    resultCode: null,
    resultDataJson: null,
    startedAtUtc: null,
    finishedAtUtc: null,
    expiresAtUtc: 130_000,
    remark: null,
    creatorId: 42,
    updaterId: null,
    createTimeUtc: 10_000,
    updateTimeUtc: null,
    ...overrides,
  };
}

function createResult(
  overrides: Partial<DeviceTaskResultPayload> = {}
): DeviceTaskResultPayload {
  return {
    protocolVersion: 2,
    taskId: "task-12345678",
    deviceId: "device-01",
    scriptId: "device.apps.list",
    status: "SUCCESS",
    code: "OK",
    message: "done",
    data: { packages: [] },
    startedAt: 10_100,
    finishedAt: 10_200,
    durationMs: 100,
    traceId: "trace-12345678",
    ...overrides,
  };
}

interface CompleteCall {
  taskId: string;
  clientId: string;
  data: DeviceTaskCompletion;
}

class FakeRepository implements DeviceTaskRepository {
  readonly tasks = new Map<string, DeviceTaskRecord>();
  readonly addCalls: DeviceTaskCreateRecord[] = [];
  readonly completeCalls: CompleteCall[] = [];
  readonly legacyCalls: Array<{
    taskId: string;
    data: {
      status: "SUCCESS" | "FAILURE";
      resultMessage: string | null;
      updaterId: number;
    };
  }> = [];
  timeoutResult = 0;
  timeoutDeadlineCutoff: number | undefined;
  timeoutFinishedAtUtc: number | undefined;

  async add(data: DeviceTaskCreateRecord): Promise<number> {
    this.addCalls.push(data);
    return 1;
  }

  async completeByTaskId(
    taskId: string,
    clientId: string,
    data: DeviceTaskCompletion
  ): Promise<boolean> {
    this.completeCalls.push({ taskId, clientId, data });
    return true;
  }

  async getByTaskId(taskId: string): Promise<DeviceTaskRecord | undefined> {
    return this.tasks.get(taskId);
  }

  async list(params: DeviceTaskListParams): Promise<DeviceTaskPage> {
    return {
      list: [],
      total: 0,
      totalPage: 0,
      currentPage: params.pageNo,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    };
  }

  async timeoutPendingTasks(
    deadlineCutoff: number,
    finishedAtUtc: number
  ): Promise<number> {
    this.timeoutDeadlineCutoff = deadlineCutoff;
    this.timeoutFinishedAtUtc = finishedAtUtc;
    return this.timeoutResult;
  }

  async updateLegacyResult(
    taskId: string,
    data: {
      status: "SUCCESS" | "FAILURE";
      resultMessage: string | null;
      updaterId: number;
    }
  ): Promise<void> {
    this.legacyCalls.push({ taskId, data });
  }
}

class FakeDeviceReader implements DeviceReader {
  readonly devices = new Map<string, { isEnabled: boolean }>();

  async getByClientId(
    clientId: string
  ): Promise<{ isEnabled: boolean } | undefined> {
    return this.devices.get(clientId);
  }
}

class FakePublisher implements DeviceTaskPublisher {
  readonly messages: DeviceTaskDispatchMessage[] = [];
  error: Error | undefined;

  async publish(message: DeviceTaskDispatchMessage): Promise<void> {
    this.messages.push(message);
    if (this.error) throw this.error;
  }
}

class FakeClock implements Clock {
  value = 10_000;

  now(): number {
    return this.value;
  }
}

class FakeIds implements IdGenerator {
  values = ["task-12345678", "trace-12345678"];

  next(): string {
    const value = this.values.shift();
    if (!value) throw new Error("测试 ID 已耗尽");
    return value;
  }
}

class FakeSettings implements DeviceTaskSettings {
  callbackUrl: string | undefined = "https://api.example.com/callback";
  resultGraceMs: unknown = 30_000;

  getCallbackUrl(): string | undefined {
    return this.callbackUrl;
  }

  getResultGraceMs(): unknown {
    return this.resultGraceMs;
  }
}

interface TestContext {
  center: DeviceTaskCenter;
  repository: FakeRepository;
  devices: FakeDeviceReader;
  publisher: FakePublisher;
  clock: FakeClock;
  settings: FakeSettings;
  handlers: DeviceTaskResultHandlerRegistry;
}

function createTestContext(): TestContext {
  const repository = new FakeRepository();
  const devices = new FakeDeviceReader();
  const publisher = new FakePublisher();
  const clock = new FakeClock();
  const settings = new FakeSettings();
  const handlers = new DeviceTaskResultHandlerRegistry();
  const center = new DeviceTaskCenter({
    repository,
    devices,
    publisher,
    clock,
    ids: new FakeIds(),
    settings,
    resultHandlers: handlers,
  });
  return {
    center,
    repository,
    devices,
    publisher,
    clock,
    settings,
    handlers,
  };
}

describe("DeviceTaskCenter 应用服务", () => {
  let context: TestContext;

  beforeEach(() => {
    context = createTestContext();
    context.devices.devices.set("device-01", { isEnabled: true });
  });

  it("先持久化任务，再发布协议 v2 消息并返回任务身份", async () => {
    const result = await context.center.dispatchTrustedTask(
      {
        clientId: "device-01",
        scriptId: "device.apps.list",
        params: { type: "third" },
        remark: "同步应用",
      },
      actor
    );

    expect(result).toEqual({
      taskId: "task-12345678",
      status: "PENDING",
      traceId: "trace-12345678",
      expiresAtUtc: 130_000,
    });
    expect(context.repository.addCalls).toHaveLength(1);
    expect(context.repository.addCalls[0]).toMatchObject({
      taskId: "task-12345678",
      clientId: "device-01",
      protocolVersion: 2,
      scriptId: "device.apps.list",
      paramsJson: JSON.stringify({ type: "third" }),
      timeoutMs: 120_000,
      traceId: "trace-12345678",
      priority: "NORMAL",
      preemptRunning: false,
      status: "PENDING",
      expiresAtUtc: 130_000,
      creatorId: actor.id,
    });
    expect(context.publisher.messages).toEqual([
      {
        protocolVersion: 2,
        taskId: "task-12345678",
        deviceId: "device-01",
        scriptId: "device.apps.list",
        scriptVersion: 1,
        params: { type: "third" },
        timeoutMs: 120_000,
        createdAt: 10_000,
        expiresAt: 130_000,
        traceId: "trace-12345678",
        priority: "NORMAL",
        preemptRunning: false,
        callbackUrl: "https://api.example.com/callback",
      },
    ]);
  });

  it("设备不存在或停用时拒绝下发且不创建任务", async () => {
    await expect(
      context.center.dispatchTrustedTask(
        { clientId: "missing", scriptId: "device.apps.list", params: {} },
        actor
      )
    ).rejects.toThrow("设备不存在: missing");

    context.devices.devices.set("disabled", { isEnabled: false });
    await expect(
      context.center.dispatchTrustedTask(
        { clientId: "disabled", scriptId: "device.apps.list", params: {} },
        actor
      )
    ).rejects.toThrow("设备已停用: disabled");

    expect(context.repository.addCalls).toHaveLength(0);
    expect(context.publisher.messages).toHaveLength(0);
  });

  it("MQTT 发布失败时将已创建任务补偿为 FAILURE", async () => {
    context.publisher.error = new Error("broker unavailable");
    context.clock.value = 20_000;

    await expect(
      context.center.dispatchTrustedTask(
        { clientId: "device-01", scriptId: "device.apps.list", params: {} },
        actor
      )
    ).rejects.toThrow("broker unavailable");

    expect(context.repository.addCalls).toHaveLength(1);
    expect(context.repository.completeCalls).toEqual([
      {
        taskId: "task-12345678",
        clientId: "device-01",
        data: {
          status: "FAILURE",
          resultCode: "MQTT_PUBLISH_FAILED",
          resultMessage: "broker unavailable",
          resultDataJson: null,
          startedAtUtc: null,
          preemptedByTaskId: null,
          finishedAtUtc: 20_000,
          updaterId: actor.id,
        },
      },
    ]);
  });

  it("四项结果身份不匹配或任务已超时时保持幂等并跳过处理器", async () => {
    const handler = vi.fn(async (): Promise<void> => undefined);
    context.handlers.register("device.apps.list", handler);
    const cases = [
      {
        result: createResult({ taskId: "incoming-task" }),
        task: createTask({ taskId: "stored-task" }),
      },
      {
        result: createResult(),
        task: createTask({ clientId: "different-device" }),
      },
      {
        result: createResult(),
        task: createTask({ scriptId: "app.install" }),
      },
      {
        result: createResult(),
        task: createTask({ traceId: "different-trace" }),
      },
      {
        result: createResult(),
        task: createTask({ status: "TIMEOUT" }),
      },
    ];

    for (const testCase of cases) {
      context.repository.tasks.clear();
      context.repository.tasks.set(testCase.result.taskId, testCase.task);
      await expect(
        context.center.processIncomingDeviceTaskResult(testCase.result)
      ).resolves.toBe(false);
    }

    expect(handler).not.toHaveBeenCalled();
    expect(context.repository.completeCalls).toHaveLength(0);
  });

  it("超大结果转换为明确失败且不执行脚本后处理器", async () => {
    const handler = vi.fn(async (): Promise<void> => undefined);
    context.handlers.register("device.apps.list", handler);
    context.repository.tasks.set("task-12345678", createTask());

    await expect(
      context.center.processIncomingDeviceTaskResult(
        createResult({ data: "中".repeat(350_000) })
      )
    ).resolves.toBe(true);

    expect(handler).not.toHaveBeenCalled();
    expect(context.repository.completeCalls[0]?.data).toMatchObject({
      status: "FAILURE",
      resultCode: "RESULT_TOO_LARGE",
      resultMessage: "设备任务结果超过 1048576 字节",
      resultDataJson: "null",
    });
  });

  it("先执行匹配脚本的结果处理器，再持久化原始终态", async () => {
    const handler = vi.fn(async (): Promise<void> => undefined);
    context.center.registerResultHandler("device.apps.list", handler);
    context.repository.tasks.set("task-12345678", createTask());
    const result = createResult();

    await expect(
      context.center.processIncomingDeviceTaskResult(result)
    ).resolves.toBe(true);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(result);
    expect(context.repository.completeCalls[0]?.data).toMatchObject({
      status: "SUCCESS",
      resultCode: "OK",
      resultDataJson: JSON.stringify({ packages: [] }),
    });
  });

  it("重复注册处理器时幂等替换，未知脚本结果保持无操作", async () => {
    const firstHandler = vi.fn(async (): Promise<void> => undefined);
    const replacementHandler = vi.fn(async (): Promise<void> => undefined);
    context.handlers.register("device.apps.list", firstHandler);
    context.handlers.register("device.apps.list", replacementHandler);

    await context.handlers.handle(createResult());
    await context.handlers.handle(createResult({ scriptId: "unknown.script" }));

    expect(firstHandler).not.toHaveBeenCalled();
    expect(replacementHandler).toHaveBeenCalledOnce();
  });

  it("结果处理器失败时保存 SERVER_RESULT_PROCESSING_FAILED", async () => {
    context.handlers.register("device.apps.list", async () => {
      throw new Error("invalid app result");
    });
    context.repository.tasks.set("task-12345678", createTask());

    await expect(
      context.center.processIncomingDeviceTaskResult(createResult())
    ).resolves.toBe(true);

    expect(context.repository.completeCalls[0]?.data).toMatchObject({
      status: "FAILURE",
      resultCode: "SERVER_RESULT_PROCESSING_FAILED",
      resultMessage: "invalid app result",
      resultDataJson: JSON.stringify({ packages: [] }),
    });
  });

  it("持久化抢占取消结果中的发起任务 ID", async () => {
    context.repository.tasks.set("task-12345678", createTask());

    await context.center.handleDeviceTaskResult(
      createResult({
        status: "CANCELLED",
        code: "PREEMPTED",
        data: { preemptedByTaskId: "task-preemptor" },
      })
    );

    expect(context.repository.completeCalls[0]?.data.preemptedByTaskId).toBe(
      "task-preemptor"
    );
  });

  it.each([
    { configured: -10, expected: 0 },
    { configured: 45_678.9, expected: 45_678 },
    { configured: 900_000, expected: 300_000 },
    { configured: "invalid", expected: 30_000 },
  ])(
    "扫描超时时将宽限值 $configured 归一化为 $expected",
    async ({ configured, expected }) => {
      context.settings.resultGraceMs = configured;
      context.repository.timeoutResult = 3;

      await expect(context.center.timeoutExpiredDeviceTasks()).resolves.toBe(3);
      expect(context.repository.timeoutDeadlineCutoff).toBe(
        context.clock.value - expected
      );
      expect(context.repository.timeoutFinishedAtUtc).toBe(context.clock.value);
    }
  );

  it("兼容旧回调：进度不落终态，首次成功结果执行更新", async () => {
    context.repository.tasks.set("task-12345678", createTask());

    await expect(
      context.center.completeLegacyDeviceTask({
        taskId: "task-12345678",
        status: "PROGRESS",
        message: "half",
      })
    ).resolves.toMatchObject({ completed: false });
    await expect(
      context.center.completeLegacyDeviceTask({
        taskId: "task-12345678",
        status: "SUCCESS",
        message: "done",
      })
    ).resolves.toMatchObject({ completed: true });

    expect(context.repository.legacyCalls).toEqual([
      {
        taskId: "task-12345678",
        data: {
          status: "SUCCESS",
          resultMessage: "done",
          updaterId: 0,
        },
      },
    ]);
  });

  it("兼容旧回调：未知任务报错，已终结任务忽略重复结果", async () => {
    await expect(
      context.center.completeLegacyDeviceTask({
        taskId: "missing-task",
        status: "FAILURE",
      })
    ).rejects.toThrow("Task not found");

    context.repository.tasks.set(
      "task-12345678",
      createTask({ status: "SUCCESS" })
    );
    await expect(
      context.center.completeLegacyDeviceTask({
        taskId: "task-12345678",
        status: "FAILURE",
      })
    ).resolves.toMatchObject({ completed: false });
    expect(context.repository.legacyCalls).toHaveLength(0);
  });
});
