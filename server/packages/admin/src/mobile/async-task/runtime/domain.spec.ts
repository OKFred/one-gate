import { describe, expect, it } from "vitest";
import {
  assertTaskRuntimeReportTime,
  parseTaskRuntimeSnapshot,
  TASK_RUNTIME_MAX_BYTES,
  type TaskRuntimeSnapshot,
} from "./domain.js";

const now = 1_800_000_000_000;
function snapshot(): TaskRuntimeSnapshot {
  return {
    protocolVersion: 2,
    deviceId: "synthetic-device",
    timestamp: now,
    sessionId: "session-synthetic-1",
    sessionStartedAt: now - 10_000,
    revision: 1,
    running: {
      taskId: "task-running-1",
      scriptId: "device.apps.list",
      priority: "NORMAL",
      createdAt: now - 2_000,
      startedAt: now - 1_000,
      position: null,
      phase: "RUNNING",
      cancellable: true,
    },
    queued: [
      {
        taskId: "task-queued-1",
        scriptId: "device.apps.list",
        priority: "HIGH",
        createdAt: now - 500,
        startedAt: null,
        position: 1,
        phase: "QUEUED",
        cancellable: true,
      },
    ],
  };
}

describe("strict phone task runtime snapshot", () => {
  it("keeps the real queue order and supports an empty snapshot", () => {
    expect(parseTaskRuntimeSnapshot(snapshot())).toEqual(snapshot());
    expect(
      parseTaskRuntimeSnapshot({ ...snapshot(), running: null, queued: [] })
    ).toMatchObject({ running: null, queued: [] });
  });

  it.each([
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      params: { secret: "not-permitted" },
    }),
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      revision: Number.MAX_SAFE_INTEGER + 1,
    }),
    (value: TaskRuntimeSnapshot) => ({ ...value, sessionStartedAt: now + 1 }),
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      running: { ...value.running, phase: "QUEUED" },
    }),
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      running: { ...value.running, phase: "STARTING", cancellable: true },
    }),
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      running: { ...value.running, startedAt: null },
    }),
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      queued: [{ ...value.queued[0], taskId: value.running?.taskId }],
    }),
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      queued: [{ ...value.queued[0], position: 2 }],
    }),
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      queued: [{ ...value.queued[0], startedAt: now }],
    }),
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      queued: [{ ...value.queued[0], createdAt: now + 1 }],
    }),
    (value: TaskRuntimeSnapshot) => ({
      ...value,
      queued: [{ ...value.queued[0], text: "not permitted" }],
    }),
  ])("rejects invalid fields, identities, times and phases", (change) => {
    expect(() => parseTaskRuntimeSnapshot(change(snapshot()))).toThrow(
      "MOBILE_TASK_RUNTIME_INVALID"
    );
  });

  it("rejects priority inversion, FIFO inversion and oversized queues", () => {
    const value = snapshot();
    const first = value.queued[0];
    const second = { ...first, taskId: "task-queued-2", position: 2 };
    expect(() =>
      parseTaskRuntimeSnapshot({
        ...value,
        queued: [{ ...first, priority: "LOW" }, second],
      })
    ).toThrow();
    expect(() =>
      parseTaskRuntimeSnapshot({
        ...value,
        queued: [first, { ...second, createdAt: first.createdAt - 1 }],
      })
    ).toThrow();
    expect(() =>
      parseTaskRuntimeSnapshot({
        ...value,
        queued: Array.from({ length: 257 }, (_, index) => ({
          ...first,
          taskId: `task-queued-${index}`,
          position: index + 1,
        })),
      })
    ).toThrow();
    expect(() =>
      parseTaskRuntimeSnapshot({
        ...value,
        extra: "x".repeat(TASK_RUNTIME_MAX_BYTES),
      })
    ).toThrow();
  });

  it("accepts STARTING only when it cannot be cancelled", () => {
    expect(
      parseTaskRuntimeSnapshot({
        ...snapshot(),
        running: {
          ...snapshot().running,
          phase: "STARTING",
          startedAt: null,
          cancellable: false,
        },
      }).running?.cancellable
    ).toBe(false);
  });

  it("enforces the buffered-report and future-clock boundaries", () => {
    expect(() =>
      assertTaskRuntimeReportTime(
        { ...snapshot(), timestamp: now - 60_000 },
        now
      )
    ).not.toThrow();
    expect(() =>
      assertTaskRuntimeReportTime(
        { ...snapshot(), timestamp: now - 60_001 },
        now
      )
    ).toThrow();
    expect(() =>
      assertTaskRuntimeReportTime(
        { ...snapshot(), timestamp: now + 30_000 },
        now
      )
    ).not.toThrow();
    expect(() =>
      assertTaskRuntimeReportTime(
        { ...snapshot(), timestamp: now + 30_001 },
        now
      )
    ).toThrow();
  });
});
