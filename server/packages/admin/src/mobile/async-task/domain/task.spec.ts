import { describe, expect, it } from "vitest";
import {
  AUTOJS6_PROTOCOL_VERSION,
  DeviceTask,
  extractPreemptedByTaskId,
  isResultPayloadWithinLimit,
  type DeviceTaskResultPayload,
  type DeviceTaskSnapshot,
} from "./task.js";

function createSnapshot(
  overrides: Partial<DeviceTaskSnapshot> = {}
): DeviceTaskSnapshot {
  return {
    taskId: "task-12345678",
    clientId: "device-01",
    protocolVersion: AUTOJS6_PROTOCOL_VERSION,
    scriptId: "device.apps.list",
    traceId: "trace-12345678",
    status: "PENDING",
    ...overrides,
  };
}

function createResult(
  overrides: Partial<DeviceTaskResultPayload> = {}
): DeviceTaskResultPayload {
  return {
    protocolVersion: AUTOJS6_PROTOCOL_VERSION,
    taskId: "task-12345678",
    deviceId: "device-01",
    scriptId: "device.apps.list",
    status: "SUCCESS",
    code: "OK",
    message: "done",
    data: { packages: [] },
    startedAt: 1_000,
    finishedAt: 2_000,
    durationMs: 1_000,
    traceId: "trace-12345678",
    ...overrides,
  };
}

describe("DeviceTask 领域聚合", () => {
  it("仅在协议、任务、设备、脚本和链路标识全部匹配时接收结果", () => {
    const task = DeviceTask.rehydrate(createSnapshot());

    expect(task.matchesResult(createResult())).toBe(true);
    expect(task.matchesResult(createResult({ taskId: "other-task" }))).toBe(
      false
    );
    expect(task.matchesResult(createResult({ deviceId: "other-device" }))).toBe(
      false
    );
    expect(task.matchesResult(createResult({ scriptId: "app.install" }))).toBe(
      false
    );
    expect(task.matchesResult(createResult({ traceId: "other-trace" }))).toBe(
      false
    );
    expect(
      DeviceTask.rehydrate(
        createSnapshot({ protocolVersion: 1 })
      ).matchesResult(createResult())
    ).toBe(false);
  });

  it.each(["PENDING", "RUNNING"] as const)(
    "%s 状态允许首次写入终态结果",
    (status) => {
      const completion = DeviceTask.rehydrate(
        createSnapshot({ status })
      ).complete(createResult(), 9_999);

      expect(completion).toEqual({
        status: "SUCCESS",
        resultCode: "OK",
        resultMessage: "done",
        resultDataJson: JSON.stringify({ packages: [] }),
        preemptedByTaskId: null,
        startedAtUtc: 1_000,
        finishedAtUtc: 2_000,
        updaterId: 0,
      });
    }
  );

  it.each(["SUCCESS", "FAILURE", "TIMEOUT", "REJECTED", "CANCELLED"] as const)(
    "%s 终态拒绝重复结果",
    (status) => {
      const task = DeviceTask.rehydrate(createSnapshot({ status }));

      expect(task.canAcceptResult(createResult())).toBe(false);
      expect(task.complete(createResult(), 9_999)).toBeNull();
    }
  );

  it("时间戳无效时使用服务端完成时间并归一化空消息", () => {
    const completion = DeviceTask.rehydrate(createSnapshot()).complete(
      createResult({
        message: "",
        startedAt: Number.NaN,
        finishedAt: Infinity,
      }),
      9_999
    );

    expect(completion).toMatchObject({
      resultMessage: null,
      startedAtUtc: null,
      finishedAtUtc: 9_999,
    });
  });

  it("仅从抢占取消结果提取发起任务 ID", () => {
    expect(
      extractPreemptedByTaskId(
        createResult({
          status: "CANCELLED",
          data: { preemptedByTaskId: "task-preemptor" },
        })
      )
    ).toBe("task-preemptor");
    expect(
      extractPreemptedByTaskId(
        createResult({ data: { preemptedByTaskId: "task-preemptor" } })
      )
    ).toBeNull();
    expect(
      extractPreemptedByTaskId(
        createResult({ status: "CANCELLED", data: ["task-preemptor"] })
      )
    ).toBeNull();
  });

  it("按 UTF-8 字节数限制结果载荷", () => {
    expect(isResultPayloadWithinLimit(createResult(), 2_000)).toBe(true);
    expect(
      isResultPayloadWithinLimit(
        createResult({ data: "中".repeat(1_000) }),
        2_000
      )
    ).toBe(false);
  });
});
