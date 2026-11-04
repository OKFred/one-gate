import { describe, expect, it, vi } from "vitest";
import {
  TaskRuntimeCenter,
  type TaskRuntimeDependencies,
} from "./application.js";
import type { TaskRuntimeSnapshot } from "./domain.js";

const now = 1_800_000_000_000;
const snapshot: TaskRuntimeSnapshot = {
  protocolVersion: 2,
  deviceId: "synthetic-device",
  timestamp: now,
  sessionId: "synthetic-session",
  sessionStartedAt: now - 10_000,
  revision: 1,
  running: null,
  queued: [
    {
      taskId: "synthetic-task-1",
      scriptId: "device.apps.list",
      priority: "NORMAL",
      createdAt: now - 1_000,
      startedAt: null,
      position: 1,
      phase: "QUEUED",
      cancellable: true,
    },
  ],
};
function dependencies(): TaskRuntimeDependencies {
  return {
    repository: {
      get: async () => ({
        clientId: snapshot.deviceId,
        sessionId: snapshot.sessionId,
        sessionStartedAt: snapshot.sessionStartedAt,
        revision: snapshot.revision,
        deviceTimeUtc: snapshot.timestamp,
        receivedTimeUtc: now,
        snapshotJson: JSON.stringify(snapshot),
      }),
      store: async () => true,
      cancellableTaskIds: vi.fn(async () => ["synthetic-task-1"]),
    },
    devices: { getByClientId: async () => ({ isEnabled: true }) },
    publisher: { publish: vi.fn(async () => undefined) },
    ids: { next: () => "synthetic-command" },
    clock: { now: () => now },
  };
}

describe("task runtime application boundaries", () => {
  it("rechecks expiry after an awaited eligibility query before publishing", async () => {
    const deps = dependencies();
    deps.clock.now = vi
      .fn()
      .mockReturnValueOnce(now)
      .mockReturnValue(now + 60_001);
    await expect(
      new TaskRuntimeCenter(deps).cancel(
        { clientId: snapshot.deviceId, taskId: "synthetic-task-1" },
        { id: 42, userId: 42, username: "synthetic" }
      )
    ).rejects.toThrow("MOBILE_TASK_RUNTIME_STALE");
    expect(deps.publisher.publish).not.toHaveBeenCalled();
  });

  it("never offers controls for a disabled device", async () => {
    const deps = dependencies();
    deps.devices.getByClientId = async () => ({ isEnabled: false });
    expect(
      await new TaskRuntimeCenter(deps).state(snapshot.deviceId)
    ).toMatchObject({ stale: true, cancellableTaskIds: [] });
    expect(deps.repository.cancellableTaskIds).not.toHaveBeenCalled();
  });

  it("rejects inconsistent stored snapshot identity", async () => {
    const deps = dependencies();
    const get = deps.repository.get;
    deps.repository.get = async (clientId) => {
      const row = await get(clientId);
      return row ? { ...row, revision: 2 } : undefined;
    };
    await expect(
      new TaskRuntimeCenter(deps).state(snapshot.deviceId)
    ).rejects.toThrow("MOBILE_TASK_RUNTIME_INVALID");
  });
});
