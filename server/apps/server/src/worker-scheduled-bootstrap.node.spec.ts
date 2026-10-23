import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecycleBinResourceAdapter } from "@hodor/core/db/recycle-bin.js";

const mocks = vi.hoisted(() => ({
  cleanupDeviceOpsAudits: vi.fn(async () => undefined),
  cleanupExpiredDeviceEvents: vi.fn(async () => undefined),
  createApp: vi.fn(),
  fetch: vi.fn(async () => new Response("http-ready")),
  ensureAdminRegistry: vi.fn(),
  postgresActive: false,
  postgresClosed: vi.fn(),
  expireDeviceOpsSessions: vi.fn(async () => undefined),
  getEnv: vi.fn(() => ""),
  markTimedOutDevicesOffline: vi.fn(async () => undefined),
  runPendingJobs: vi.fn(async () => undefined),
  departmentCleanup: vi.fn(async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
  roleCleanup: vi.fn(async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
  archiveCleanup: vi.fn(async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
  setD1Binding: vi.fn(),
  setEnv: vi.fn(),
  setKVBinding: vi.fn(),
  timeoutExpiredDeviceTasks: vi.fn(async () => undefined),
  verifyDeviceReportToken: vi.fn(async () => undefined),
}));

vi.mock("./index.js", () => ({ default: mocks.createApp }));
vi.mock("@hodor/admin/register.js", () => ({
  ensureAdminRegistry: mocks.ensureAdminRegistry,
}));
vi.mock("@hodor/core/db/postgresql/drivers.js", () => ({
  withWorkerPostgres: async (
    _config: { connectionString: string; schema: string },
    operation: () => Promise<unknown>
  ) => {
    mocks.postgresActive = true;
    try {
      return await operation();
    } finally {
      mocks.postgresActive = false;
      mocks.postgresClosed();
    }
  },
}));
vi.mock("./mobile-ops-session.js", () => ({ MobileOpsSession: class {} }));
vi.mock("./totp-gate-coordinator.js", () => ({
  CloudflareTotpAttemptCoordinator: class {},
  TotpGateCoordinator: class {},
}));
vi.mock("@hodor/admin/system/auth/totp-gate/index.js", () => ({
  createTotpGateCenter: vi.fn(),
}));
vi.mock("@hodor/core/db/index.js", () => ({
  setD1Binding: mocks.setD1Binding,
}));
vi.mock("@hodor/core/middleware/cache/index.js", () => ({
  setKVBinding: mocks.setKVBinding,
}));
vi.mock("@hodor/core/utils/env.js", () => ({
  getEnv: mocks.getEnv,
  setEnv: mocks.setEnv,
}));
vi.mock("@hodor/admin/maintenance/cron/scheduler.js", () => ({
  runPendingJobs: mocks.runPendingJobs,
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
vi.mock("@hodor/admin/system/role/facade.js", () => ({
  roleRecycleBinAdapter: {
    resourceType: "role",
    labelKey: "businessType.admin.system.role",
    can: async () => true,
    list: async () => ({ total: 0, list: [] }),
    restore: async ({ id }) => id,
    purge: async ({ id }) => id,
    purgeExpired: mocks.roleCleanup,
  } satisfies RecycleBinResourceAdapter,
}));
vi.mock("@hodor/admin/maintenance/compliance/department-cleanup.js", () => ({
  purgeExpiredDepartmentArchives: mocks.archiveCleanup,
}));
vi.mock("@hodor/admin/mobile/async-task/facade.js", () => ({
  timeoutExpiredDeviceTasks: mocks.timeoutExpiredDeviceTasks,
}));
vi.mock("@hodor/admin/mobile/device/facade.js", () => ({
  cleanupExpiredDeviceEvents: mocks.cleanupExpiredDeviceEvents,
  markTimedOutDevicesOffline: mocks.markTimedOutDevicesOffline,
  verifyDeviceReportToken: mocks.verifyDeviceReportToken,
}));
vi.mock("@hodor/admin/mobile/device-ops/facade.js", () => ({
  cleanupDeviceOpsAudits: mocks.cleanupDeviceOpsAudits,
  expireDeviceOpsSessions: mocks.expireDeviceOpsSessions,
}));

describe("Worker scheduled bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.postgresActive = false;
    mocks.createApp.mockImplementation(() => {
      mocks.ensureAdminRegistry();
      return { fetch: mocks.fetch };
    });
  });

  async function harness(postgresql = false) {
    const { default: worker } = await import("./worker.js");
    const env = {
      DB: {},
      KV: {},
      ...(postgresql
        ? {
            DATABASE_BACKEND: "postgresql",
            HYPERDRIVE: { connectionString: "postgresql://example.invalid" },
          }
        : {}),
    } as Parameters<typeof worker.scheduled>[1];
    const queued: Promise<unknown>[] = [];
    const waitUntil = vi.fn((promise: Promise<unknown>) =>
      queued.push(promise)
    );
    const ctx = { waitUntil } as ExecutionContext;
    const tick = async () => {
      await worker.scheduled(
        { scheduledTime: Date.now(), cron: "* * * * *", noRetry: () => {} },
        env,
        ctx
      );
      await Promise.all(queued.splice(0));
    };
    return { worker, env, ctx, waitUntil, tick };
  }

  it("registers services before cold scheduled work without constructing HTTP routes", async () => {
    const { env, waitUntil, tick } = await harness();
    await tick();
    expect(mocks.setD1Binding).toHaveBeenCalledWith(env.DB);
    expect(mocks.setKVBinding).toHaveBeenCalledWith(env.KV);
    expect(mocks.setEnv).toHaveBeenCalledWith(env);
    expect(mocks.createApp).not.toHaveBeenCalled();
    expect(mocks.ensureAdminRegistry).toHaveBeenCalledTimes(1);
    expect(mocks.runPendingJobs).toHaveBeenCalledTimes(1);
    expect(mocks.departmentCleanup).toHaveBeenCalledExactlyOnceWith({
      now: expect.any(Number),
      batchSize: 100,
    });
    expect(mocks.roleCleanup).toHaveBeenCalledExactlyOnceWith({
      now: expect.any(Number),
      batchSize: 100,
    });
    expect(mocks.archiveCleanup).toHaveBeenCalledExactlyOnceWith({
      now: expect.any(Number),
      batchSize: 100,
    });
    expect(mocks.setEnv.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.ensureAdminRegistry.mock.invocationCallOrder[0]
    );
    expect(mocks.ensureAdminRegistry.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.departmentCleanup.mock.invocationCallOrder[0]
    );
    expect(mocks.ensureAdminRegistry.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.runPendingJobs.mock.invocationCallOrder[0]
    );
    for (const maintenance of [
      mocks.timeoutExpiredDeviceTasks,
      mocks.markTimedOutDevicesOffline,
      mocks.cleanupExpiredDeviceEvents,
      mocks.expireDeviceOpsSessions,
      mocks.cleanupDeviceOpsAudits,
    ])
      expect(maintenance).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("keeps repeated scheduled events lightweight and builds HTTP once on later fetch", async () => {
    const { worker, env, ctx, tick } = await harness();
    await tick();
    await tick();
    expect(mocks.createApp).not.toHaveBeenCalled();
    await worker.fetch(
      new Request("https://example.invalid/healthCheck"),
      env,
      ctx
    );
    await worker.fetch(
      new Request("https://example.invalid/healthCheck"),
      env,
      ctx
    );
    await tick();
    expect(mocks.createApp).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.runPendingJobs).toHaveBeenCalledTimes(3);
  });

  it("does not rebuild HTTP when fetch arrives before scheduled", async () => {
    const { worker, env, ctx, tick } = await harness();
    await worker.fetch(
      new Request("https://example.invalid/healthCheck"),
      env,
      ctx
    );
    await tick();
    expect(mocks.createApp).toHaveBeenCalledTimes(1);
    expect(mocks.runPendingJobs).toHaveBeenCalledTimes(1);
  });

  it("runs only retention in a live PostgreSQL scope without creating HTTP routes", async () => {
    const { tick } = await harness(true);
    mocks.departmentCleanup.mockImplementationOnce(async () => {
      expect(mocks.postgresActive).toBe(true);
      return {
        deletedCount: 0,
        remainingExpired: 0,
        oldestExpiredTimeUtc: null,
      };
    });
    await tick();
    expect(mocks.createApp).not.toHaveBeenCalled();
    expect(mocks.setD1Binding).not.toHaveBeenCalled();
    expect(mocks.ensureAdminRegistry).toHaveBeenCalledTimes(1);
    expect(mocks.departmentCleanup).toHaveBeenCalledTimes(1);
    expect(mocks.roleCleanup).toHaveBeenCalledTimes(1);
    expect(mocks.archiveCleanup).toHaveBeenCalledTimes(1);
    for (const unavailable of [
      mocks.runPendingJobs,
      mocks.timeoutExpiredDeviceTasks,
      mocks.markTimedOutDevicesOffline,
      mocks.cleanupExpiredDeviceEvents,
      mocks.expireDeviceOpsSessions,
      mocks.cleanupDeviceOpsAudits,
    ])
      expect(unavailable).not.toHaveBeenCalled();
    expect(mocks.postgresClosed).toHaveBeenCalledTimes(1);
  });

  it("closes the PostgreSQL scope and reports a failed retention tick", async () => {
    const { tick } = await harness(true);
    mocks.departmentCleanup.mockRejectedValueOnce(new Error("private failure"));
    const errors = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      await expect(tick()).rejects.toThrow("Scheduled maintenance failed");
      expect(mocks.postgresClosed).toHaveBeenCalledTimes(1);
      expect(mocks.roleCleanup).toHaveBeenCalledTimes(1);
      expect(errors).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "scheduled_task_failed",
          task: "retention",
        })
      );
      expect(JSON.stringify(errors.mock.calls)).not.toContain(
        "private failure"
      );
    } finally {
      errors.mockRestore();
    }
  });
});
