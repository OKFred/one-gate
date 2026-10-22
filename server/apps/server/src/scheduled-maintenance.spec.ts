import { afterEach, describe, expect, it, vi } from "vitest";
import { runScheduledMaintenance } from "./scheduled-maintenance.js";

describe("safe scheduled maintenance diagnostics", () => {
  afterEach(() => vi.restoreAllMocks());

  it("keeps successful and empty ticks quiet", async () => {
    const logger = { error: vi.fn() };
    const run = vi.fn(async () => undefined);
    await runScheduledMaintenance([{ name: "cron_jobs", run }], logger);
    await runScheduledMaintenance([], logger);
    expect(run).toHaveBeenCalledOnce();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs failures immediately but waits for every task before rejecting", async () => {
    const logger = { error: vi.fn() };
    let finish: (() => void) | undefined;
    let completed = false;
    let rejected = false;
    const contextIds: string[] = [];
    const scheduled = runScheduledMaintenance(
      [
        {
          name: "cron_jobs",
          run: ({ runId }) => {
            contextIds.push(runId);
            throw new Error("private SQL parameters", {
              cause: new Error("Network connection lost."),
            });
          },
        },
        {
          name: "device_offline",
          run: async ({ runId }) => {
            contextIds.push(runId);
            throw { code: "23503", message: "private token" };
          },
        },
        {
          name: "retention",
          run: ({ runId }) => {
            contextIds.push(runId);
            return new Promise<void>((resolve) => {
              finish = () => {
                completed = true;
                resolve();
              };
            });
          },
        },
      ],
      logger
    );
    void scheduled.catch(() => {
      rejected = true;
    });
    const result = expect(scheduled).rejects.toThrow(
      "Scheduled maintenance failed; inspect task logs"
    );
    await Promise.resolve();
    expect(completed).toBe(false);
    expect(rejected).toBe(false);
    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error.mock.calls.map(([event]) => event.event)).toEqual([
      "scheduled_task_failed",
      "scheduled_task_failed",
    ]);
    finish?.();
    await result;
    expect(completed).toBe(true);
    expect(rejected).toBe(true);
    expect(new Set(contextIds).size).toBe(1);
    expect(contextIds[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(logger.error).toHaveBeenCalledTimes(3);
    expect(logger.error).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: "scheduled_task_failed",
        runId: contextIds[0],
        task: "cron_jobs",
        causeCode: "NETWORK_CONNECTION_LOST",
        durationMs: expect.any(Number),
      })
    );
    expect(logger.error).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: "scheduled_task_failed",
        runId: contextIds[0],
        task: "device_offline",
        causeCode: "POSTGRES_CONSTRAINT_VIOLATION",
      })
    );
    expect(logger.error).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        event: "scheduled_maintenance_failed",
        runId: contextIds[0],
        taskCount: 3,
        failedTaskCount: 2,
      })
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toMatch(
      /private|SQL parameters|token/
    );
  });

  it("does not retry failed work inside a tick and gives the next tick a new identity", async () => {
    const logger = { error: vi.fn() };
    const identities: string[] = [];
    let calls = 0;
    const run = async ({ runId }: { readonly runId: string }) => {
      identities.push(runId);
      calls += 1;
      if (calls === 1) throw "private failure";
    };
    await expect(
      runScheduledMaintenance([{ name: "cron_jobs", run }], logger)
    ).rejects.toThrow("Scheduled maintenance failed");
    expect(calls).toBe(1);
    await runScheduledMaintenance([{ name: "cron_jobs", run }], logger);
    expect(calls).toBe(2);
    expect(identities[0]).not.toBe(identities[1]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ causeCode: "UNKNOWN" })
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
      "private failure"
    );
  });

  it("keeps durations nonnegative when the wall clock moves backwards", async () => {
    const logger = { error: vi.fn() };
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(200)
      .mockReturnValue(100);
    await expect(
      runScheduledMaintenance(
        [
          {
            name: "retention",
            run: async () => {
              throw new Error("private");
            },
          },
        ],
        logger
      )
    ).rejects.toThrow("Scheduled maintenance failed");
    expect(logger.error).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ durationMs: 0 })
    );
    expect(logger.error).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ durationMs: 0 })
    );
  });
});
