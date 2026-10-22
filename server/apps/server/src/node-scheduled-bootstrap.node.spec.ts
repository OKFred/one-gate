import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecycleBinResourceAdapter } from "@hodor/core/db/recycle-bin.js";

const mocks = vi.hoisted(() => ({
  createApp: vi.fn(() => ({ fetch: vi.fn() })),
  schedule: vi.fn(),
  postgresql: false,
  databaseActive: false,
  databaseRun: vi.fn(),
  cron: vi.fn(async () => undefined),
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
}));
vi.mock("./index.js", () => ({ default: mocks.createApp }));
vi.mock("@hodor/core/utils/env.js", () => ({
  getEnv: (key: string) => {
    if (key === "PORT") return "8787";
    if (key === "DATABASE_URL" && mocks.postgresql)
      return "postgresql://example.invalid";
    return undefined;
  },
}));
vi.mock("@hodor/core/db/postgresql/runtime.js", () => ({
  isPostgresBackend: () => mocks.postgresql,
}));
vi.mock("@hodor/core/db/postgresql/drivers.js", () => ({
  createNodePostgresRuntime: () => ({ run: mocks.databaseRun, close: vi.fn() }),
}));
vi.mock("@hono/node-server", () => ({ serve: vi.fn(() => ({ on: vi.fn() })) }));
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

describe("Node scheduled bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.postgresql = false;
    mocks.databaseActive = false;
    mocks.databaseRun.mockImplementation(
      async (operation: () => Promise<void>) => {
        mocks.databaseActive = true;
        try {
          return await operation();
        } finally {
          mocks.databaseActive = false;
        }
      }
    );
  });

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
    expect(mocks.roleCleanup).toHaveBeenCalledExactlyOnceWith({
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

  it("runs only retention inside the PostgreSQL context", async () => {
    mocks.postgresql = true;
    mocks.departmentCleanup.mockImplementationOnce(async () => {
      expect(mocks.databaseActive).toBe(true);
      return {
        deletedCount: 0,
        remainingExpired: 0,
        oldestExpiredTimeUtc: null,
      };
    });
    await import("./node.js");
    const tick: () => Promise<void> = mocks.schedule.mock.calls[0][1];
    await tick();
    expect(mocks.databaseRun).toHaveBeenCalledTimes(1);
    expect(mocks.departmentCleanup).toHaveBeenCalledTimes(1);
    expect(mocks.roleCleanup).toHaveBeenCalledTimes(1);
    expect(mocks.archiveCleanup).toHaveBeenCalledTimes(1);
    expect(mocks.cron).not.toHaveBeenCalled();
    expect(mocks.databaseActive).toBe(false);
  });

  it("reports PostgreSQL retention failures without raw database details", async () => {
    mocks.postgresql = true;
    mocks.departmentCleanup.mockRejectedValueOnce(
      new Error("private database failure")
    );
    const errors = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      await import("./node.js");
      const tick: () => Promise<void> = mocks.schedule.mock.calls[0][1];
      await tick();
      expect(mocks.archiveCleanup).toHaveBeenCalledTimes(1);
      expect(errors).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "scheduled_task_failed",
          task: "retention",
        })
      );
      expect(JSON.stringify(errors.mock.calls)).not.toContain(
        "private database failure"
      );
      expect(mocks.databaseActive).toBe(false);
    } finally {
      errors.mockRestore();
    }
  });
});
