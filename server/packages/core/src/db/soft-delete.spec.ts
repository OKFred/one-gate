import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runSoftDeleteCleanup,
  SOFT_DELETE_BATCH_SIZE,
  SOFT_DELETE_RETENTION_MS,
} from "./soft-delete";

describe("registered soft-delete cleanup", () => {
  const empty = {
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  };
  const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
  afterEach(() => vi.restoreAllMocks());

  it("records a completed empty check for each supplied adapter with one bounded batch", async () => {
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
    expect(log.info).toHaveBeenCalledExactlyOnceWith({
      event: "soft_delete_cleanup",
      module: "department",
      checkedTimeUtc: 123,
      cutoffTimeUtc: 123 - SOFT_DELETE_RETENTION_MS,
      ...empty,
      overdueMs: 0,
      durationMs: expect.any(Number),
    });
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
        checkedTimeUtc: 123,
        overdueMs: 118,
      })
    );
    expect(log.info).not.toHaveBeenCalled();
  });

  it("publishes only approved metrics even when an adapter returns private fields", async () => {
    const log = logger();
    await runSoftDeleteCleanup(
      [
        {
          module: "document",
          purgeExpired: async () => ({
            ...empty,
            deletedCount: 2,
            recordSnapshot: {
              name: "private record",
              token: "sensitive token",
            },
            event: "forged_event",
            module: "forged_module",
            checkedTimeUtc: 999,
          }),
        },
      ],
      123,
      log
    );
    expect(log.info).toHaveBeenCalledExactlyOnceWith({
      event: "soft_delete_cleanup",
      module: "document",
      checkedTimeUtc: 123,
      cutoffTimeUtc: 123 - SOFT_DELETE_RETENTION_MS,
      deletedCount: 2,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
      overdueMs: 0,
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(log.info.mock.calls)).not.toMatch(
      /private|sensitive|forged/
    );
  });

  it("treats the exact expiration boundary as backlog with zero overdue duration", async () => {
    const log = logger();
    await runSoftDeleteCleanup(
      [
        {
          module: "department",
          purgeExpired: async () => ({
            deletedCount: 0,
            remainingExpired: 1,
            oldestExpiredTimeUtc: 0,
          }),
        },
      ],
      0,
      log
    );
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        remainingExpired: 1,
        oldestExpiredTimeUtc: 0,
        overdueMs: 0,
      })
    );
  });

  it.each([
    {
      reason: "negative deletion count",
      result: { ...empty, deletedCount: -1 },
    },
    {
      reason: "fractional deletion count",
      result: { ...empty, deletedCount: 0.5 },
    },
    { reason: "more than one batch", result: { ...empty, deletedCount: 101 } },
    { reason: "NaN count", result: { ...empty, deletedCount: Number.NaN } },
    {
      reason: "infinite count",
      result: { ...empty, deletedCount: Number.POSITIVE_INFINITY },
    },
    { reason: "negative backlog", result: { ...empty, remainingExpired: -1 } },
    {
      reason: "fractional backlog",
      result: { ...empty, remainingExpired: 1.5 },
    },
    {
      reason: "unsafe backlog",
      result: { ...empty, remainingExpired: Number.MAX_SAFE_INTEGER + 1 },
    },
    {
      reason: "missing oldest deadline",
      result: { ...empty, remainingExpired: 1 },
    },
    {
      reason: "deadline without backlog",
      result: { ...empty, oldestExpiredTimeUtc: 5 },
    },
    {
      reason: "negative oldest deadline",
      result: { ...empty, remainingExpired: 1, oldestExpiredTimeUtc: -1 },
    },
    {
      reason: "future oldest deadline",
      result: { ...empty, remainingExpired: 1, oldestExpiredTimeUtc: 124 },
    },
  ])(
    "rejects $reason and still checks the next resource",
    async ({ result }) => {
      const log = logger();
      const next = vi.fn(async () => empty);
      await expect(
        runSoftDeleteCleanup(
          [
            {
              module: "invalid",
              purgeExpired: async () => ({
                ...result,
                recordSnapshot: "sensitive",
              }),
            },
            { module: "next", purgeExpired: next },
          ],
          123,
          log
        )
      ).rejects.toThrow("retry on next tick");
      expect(log.error).toHaveBeenCalledExactlyOnceWith({
        event: "soft_delete_cleanup_failed",
        module: "invalid",
        checkedTimeUtc: 123,
        cutoffTimeUtc: 123 - SOFT_DELETE_RETENTION_MS,
        errorCode: "CLEANUP_INVALID_RESULT",
        durationMs: expect.any(Number),
      });
      expect(next).toHaveBeenCalledOnce();
      expect(log.info).toHaveBeenCalledOnce();
      expect(log.warn).not.toHaveBeenCalled();
      expect(JSON.stringify(log.error.mock.calls)).not.toContain("sensitive");
    }
  );

  it("does not discover or invoke unregistered resources", async () => {
    const log = logger();
    await runSoftDeleteCleanup([], 123, log);
    expect(log.info).not.toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  it("keeps elapsed duration nonnegative when the wall clock moves backwards", async () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(200).mockReturnValueOnce(100);
    const log = logger();
    await runSoftDeleteCleanup(
      [{ module: "department", purgeExpired: async () => empty }],
      123,
      log
    );
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ durationMs: 0 })
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
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: "CLEANUP_FAILED",
        checkedTimeUtc: 123,
      })
    );
    await runSoftDeleteCleanup(adapters, 124, log);
    expect(purgeExpired).toHaveBeenCalledTimes(2);
    expect(log.info).toHaveBeenCalledTimes(3);
  });
});
