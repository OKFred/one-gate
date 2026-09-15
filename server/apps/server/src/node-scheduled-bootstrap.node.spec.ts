import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createApp: vi.fn(() => ({ fetch: vi.fn() })),
  schedule: vi.fn(),
  cron: vi.fn(async () => undefined),
  retention: vi.fn(async () => undefined),
}));
vi.mock("./index.js", () => ({ default: mocks.createApp }));
vi.mock("@hodor/core/utils/env.js", () => ({ getEnv: () => "8787" }));
vi.mock("@hono/node-server", () => ({ serve: vi.fn() }));
vi.mock("node-cron", () => ({ default: { schedule: mocks.schedule } }));
vi.mock("@hodor/admin/maintenance/cron/scheduler.js", () => ({
  runPendingJobs: mocks.cron,
}));
vi.mock("@hodor/admin/mqtt/listener.js", () => ({
  startMqttEventListener: vi.fn(),
}));
vi.mock("@hodor/admin/system/auth/totp-gate/index.js", () => ({
  InMemoryTotpAttemptCoordinator: class {},
  createTotpGateCenter: vi.fn(),
}));
vi.mock("./soft-delete-cleanup.js", () => ({
  runRetentionMaintenance: mocks.retention,
  runScheduledMaintenance: async (tasks: (() => Promise<unknown>)[]) => {
    await Promise.all(tasks.map((task) => task()));
  },
}));

describe("Node scheduled bootstrap", () => {
  it("initializes the app and invokes retention on the existing minute driver", async () => {
    await import("./node.js");
    expect(mocks.schedule).toHaveBeenCalledExactlyOnceWith(
      "* * * * *",
      expect.any(Function)
    );
    const tick: () => Promise<void> = mocks.schedule.mock.calls[0][1];
    await tick();
    expect(mocks.cron).toHaveBeenCalledTimes(1);
    expect(mocks.retention).toHaveBeenCalledTimes(1);
    expect(mocks.createApp.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.retention.mock.invocationCallOrder[0]
    );
  });
});
