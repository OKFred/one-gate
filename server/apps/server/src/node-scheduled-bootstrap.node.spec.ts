import { describe, expect, it, vi } from "vitest";
import type { RecycleBinResourceAdapter } from "@hodor/core/db/recycle-bin.js";

const mocks = vi.hoisted(() => ({
  createApp: vi.fn(() => ({ fetch: vi.fn() })),
  schedule: vi.fn(),
  cron: vi.fn(async () => undefined),
  departmentCleanup: vi.fn(async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
  archiveCleanup: vi.fn(async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
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
vi.mock("@hodor/admin/system/department/facade.js", () => ({
  departmentRecycleBinAdapter: {
    resourceType: "department",
    labelKey: "business.department",
    can: async () => true,
    list: async () => ({ total: 0, list: [] }),
    restore: async ({ id }) => id,
    purge: async ({ id }) => id,
    purgeExpired: mocks.departmentCleanup,
  } satisfies RecycleBinResourceAdapter,
}));
vi.mock("@hodor/admin/maintenance/compliance/department-cleanup.js", () => ({
  purgeExpiredDepartmentArchives: mocks.archiveCleanup,
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
    expect(mocks.departmentCleanup).toHaveBeenCalledExactlyOnceWith({
      now: expect.any(Number),
      batchSize: 100,
    });
    expect(mocks.archiveCleanup).toHaveBeenCalledExactlyOnceWith({
      now: expect.any(Number),
      batchSize: 100,
    });
    expect(mocks.createApp.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.departmentCleanup.mock.invocationCallOrder[0]
    );
  });
});
