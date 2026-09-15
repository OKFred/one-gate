import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecycleBinResourceAdapter } from "@hodor/core/db/recycle-bin.js";
import type { SoftDeleteCleanupInput } from "@hodor/core/db/soft-delete.js";

const mocks = vi.hoisted(() => ({
  department: vi.fn(async (_input: SoftDeleteCleanupInput) => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
  archive: vi.fn(async (_input: SoftDeleteCleanupInput) => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
}));
vi.mock("@hodor/admin/system/department/facade.js", () => ({
  departmentRecycleBinAdapter: {
    resourceType: "department",
    labelKey: "business.department",
    can: async () => true,
    list: async () => ({ total: 0, list: [] }),
    restore: async ({ id }) => id,
    purge: async ({ id }) => id,
    purgeExpired: mocks.department,
  } satisfies RecycleBinResourceAdapter,
}));
vi.mock("@hodor/admin/maintenance/compliance/department-cleanup.js", () => ({
  purgeExpiredDepartmentArchives: mocks.archive,
}));

describe("shared scheduled retention", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("composes the production resource before any application is created", async () => {
    const { runRetentionMaintenance } = await import("./soft-delete-cleanup");
    const { recycleBinRegistry } = await import("./recycle-bin-resources");
    expect(
      recycleBinRegistry.list().map(({ resourceType }) => resourceType)
    ).toEqual(["department"]);
    await runRetentionMaintenance();
    expect(mocks.department).toHaveBeenCalledTimes(1);
    expect(mocks.archive).toHaveBeenCalledTimes(1);
    expect(mocks.department).toHaveBeenCalledWith({
      now: expect.any(Number),
      batchSize: 100,
    });
    expect(mocks.archive).toHaveBeenCalledWith(
      mocks.department.mock.calls[0][0]
    );
  });

  it("automatically cleans a second registered resource and isolates a failed resource", async () => {
    const { runRetentionMaintenance } = await import("./soft-delete-cleanup");
    const { recycleBinRegistry } = await import("./recycle-bin-resources");
    const secondCleanup = vi.fn(async () => ({
      deletedCount: 0,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    }));
    const secondResource: RecycleBinResourceAdapter = {
      resourceType: "test_document",
      labelKey: "test.document",
      can: async () => true,
      list: async () => ({ total: 0, list: [] }),
      restore: async ({ id }) => id,
      purge: async ({ id }) => id,
      purgeExpired: secondCleanup,
    };
    recycleBinRegistry.register(secondResource);
    mocks.department.mockRejectedValueOnce(
      new Error("private database details")
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await expect(runRetentionMaintenance()).rejects.toThrow(
        "Soft-delete cleanup failed"
      );
      expect(secondCleanup).toHaveBeenCalledExactlyOnceWith({
        now: expect.any(Number),
        batchSize: 100,
      });
      expect(mocks.archive).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "soft_delete_cleanup_failed",
          module: "department",
        })
      );
      expect(JSON.stringify(log.mock.calls)).not.toContain(
        "private database details"
      );
    } finally {
      log.mockRestore();
    }
  });

  it("awaits retention completion even when editable Cron rejects first", async () => {
    const { runScheduledMaintenance } = await import("./soft-delete-cleanup");
    let finish: (() => void) | undefined;
    let retentionCompleted = false;
    const retention = () =>
      new Promise<void>((resolve) => {
        finish = () => {
          retentionCompleted = true;
          resolve();
        };
      });
    const scheduled = runScheduledMaintenance([
      async () => {
        throw new Error("cron failed");
      },
      retention,
    ]);
    const rejected = expect(scheduled).rejects.toThrow(
      "Scheduled maintenance failed"
    );
    await Promise.resolve();
    expect(retentionCompleted).toBe(false);
    finish?.();
    await rejected;
    expect(retentionCompleted).toBe(true);
  });
});
