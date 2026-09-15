import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  department: vi.fn(async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
  archive: vi.fn(async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
}));
vi.mock("@hodor/admin/system/department/facade.js", () => ({
  purgeExpiredDepartments: mocks.department,
}));
vi.mock("@hodor/admin/maintenance/compliance/department-cleanup.js", () => ({
  purgeExpiredDepartmentArchives: mocks.archive,
}));
import {
  runRetentionMaintenance,
  runScheduledMaintenance,
} from "./soft-delete-cleanup";

describe("shared scheduled retention", () => {
  it("runs exactly the two registered department cleanup adapters", async () => {
    await runRetentionMaintenance();
    expect(mocks.department).toHaveBeenCalledTimes(1);
    expect(mocks.archive).toHaveBeenCalledTimes(1);
    expect(mocks.department).toHaveBeenCalledWith({
      now: expect.any(Number),
      batchSize: 100,
    });
  });

  it("awaits retention completion even when editable Cron rejects first", async () => {
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
