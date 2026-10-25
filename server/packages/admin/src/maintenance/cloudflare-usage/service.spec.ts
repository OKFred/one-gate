import { describe, expect, it, vi } from "vitest";
import { Validator, type Schema } from "@cfworker/json-schema";
import { UsageOverviewRequestSchema } from "./model";
import { readUsageOverview } from "./service";
import type { StoredUsage, UsageRepository } from "./types";

const validator = new Validator(
  JSON.parse(JSON.stringify(UsageOverviewRequestSchema)) as Schema
);

describe("Cloudflare overview day ranges", () => {
  it.each([1, 3, 7, 30] as const)("accepts the %i-day request", (days) => {
    expect(validator.validate({ days }).valid).toBe(true);
  });
  it("preserves an optional default range", () => {
    expect(validator.validate({}).valid).toBe(true);
  });
  it.each([0, 2, 4, 31, -1, 1.5, "1", null])(
    "rejects unsupported range %s",
    (days) => expect(validator.validate({ days }).valid).toBe(false)
  );
  it.each([1, 3, 7, 30, undefined] as const)(
    "reads %s UTC calendar days including today, at either side of midnight",
    async (days) => {
      const stored: StoredUsage = {
        snapshots: [],
        history: [],
        coverage: [],
        sync: {
          state: "idle",
          jobId: null,
          lastSuccessTimeUtc: null,
          nextRunTimeUtc: null,
          retryTimeUtc: null,
        },
      };
      const read = vi.fn<UsageRepository["read"]>().mockResolvedValue(stored);
      const unused = async (): Promise<never> => {
        throw new Error("Write operations must not run while reading overview");
      };
      const repository: UsageRepository = {
        read,
        request: unused,
        claim: unused,
        checkpoint: unused,
        publish: unused,
        fail: unused,
      };
      const config = {
        accountId: "synthetic",
        analyticsToken: "synthetic-token",
        billingToken: null,
      };
      await readUsageOverview(
        { days },
        { now: Date.UTC(2026, 9, 26) - 1, repository, config }
      );
      expect(read).toHaveBeenLastCalledWith(
        "synthetic",
        Date.UTC(2026, 9, 26 - (days ?? 7))
      );
      await readUsageOverview(
        { days },
        { now: Date.UTC(2026, 9, 26), repository, config }
      );
      expect(read).toHaveBeenLastCalledWith(
        "synthetic",
        Date.UTC(2026, 9, 27 - (days ?? 7))
      );
    }
  );
});
