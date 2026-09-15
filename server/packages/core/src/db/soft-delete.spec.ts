import { describe, expect, it, vi } from "vitest";
import { runSoftDeleteCleanup, SOFT_DELETE_BATCH_SIZE } from "./soft-delete";

describe("registered soft-delete cleanup", () => {
  const empty = {
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  };
  const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

  it("runs only supplied adapters with one bounded batch and stays quiet when empty", async () => {
    const purgeExpired = vi.fn(async () => empty);
    const log = logger();
    await runSoftDeleteCleanup(
      [{ module: "department", purgeExpired }],
      123,
      log
    );
    expect(purgeExpired).toHaveBeenCalledExactlyOnceWith({
      now: 123,
      batchSize: SOFT_DELETE_BATCH_SIZE,
    });
    expect(log.info).not.toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  it("reports backlog without record contents", async () => {
    const log = logger();
    await runSoftDeleteCleanup(
      [
        {
          module: "department",
          purgeExpired: async () => ({
            deletedCount: 100,
            remainingExpired: 1,
            oldestExpiredTimeUtc: 5,
          }),
        },
      ],
      123,
      log
    );
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "department",
        deletedCount: 100,
        remainingExpired: 1,
        oldestExpiredTimeUtc: 5,
      })
    );
  });

  it("finishes other adapters, sanitizes failure and retries on a later tick", async () => {
    const purgeExpired = vi
      .fn()
      .mockRejectedValueOnce(new Error("sensitive SQL payload"))
      .mockResolvedValue(empty);
    const other = vi.fn(async () => empty);
    const adapters = [
      { module: "department", purgeExpired },
      { module: "legacy_department_archive", purgeExpired: other },
    ];
    const log = logger();
    await expect(runSoftDeleteCleanup(adapters, 123, log)).rejects.toThrow(
      "retry on next tick"
    );
    expect(other).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.error.mock.calls)).not.toContain("sensitive");
    await runSoftDeleteCleanup(adapters, 124, log);
    expect(purgeExpired).toHaveBeenCalledTimes(2);
  });
});
