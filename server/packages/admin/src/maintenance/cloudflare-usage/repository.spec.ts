import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import db from "@hodor/core/db/index";
import { sql } from "drizzle-orm";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import snapshotSql from "@hodor/core/db/sql/admin/cloudflare_usage_snapshot.sql?raw";
import dailySql from "@hodor/core/db/sql/admin/cloudflare_usage_daily.sql?raw";
import syncSql from "@hodor/core/db/sql/admin/cloudflare_usage_sync.sql?raw";
import { getUsageRepository } from "./repository";
import {
  DAY_MS,
  LEASE_MS,
  type UsageCursor,
  type SourceSnapshot,
} from "./types";
import { readUsageOverview } from "./service";
export function syntheticSnapshot(now: number): SourceSnapshot {
  return {
    source: "billing-usage",
    accountName: "Synthetic account",
    metrics: [],
    costs: [],
    coverage: [{ product: "Billing usage", status: "available", reason: null }],
    collectedTimeUtc: now,
    history: [
      {
        metricId: "synthetic:known",
        dayUtc: Math.floor(now / DAY_MS) * DAY_MS,
        value: 12,
        kind: "daily_usage",
        source: "billing-v2",
      },
    ],
  };
}
describe("Cloudflare usage persistent jobs (SQLite / D1)", () => {
  const now = Date.UTC(2026, 9, 25, 4);
  beforeAll(() => setupTestDb(db, [snapshotSql, dailySql, syncSql]));
  beforeEach(() =>
    clearTestData(db, [
      "cloudflare_usage_snapshot",
      "cloudflare_usage_daily",
      "cloudflare_usage_sync",
    ])
  );
  it.each([6, 14, 15, 31, 159])(
    "publishes every row across native D1 compound SELECT boundaries (%i rows)",
    async (size) => {
      const repository = getUsageRepository();
      await repository.request("synthetic", now, "history-job", true);
      const lease = (await repository.claim("synthetic", now, "history-run"))!;
      const snapshot = syntheticSnapshot(now);
      snapshot.history = Array.from({ length: size }, (_, i) => ({
        ...snapshot.history[0],
        metricId: `synthetic:metric-${i}`,
        value: i % 4 === 0 ? null : i,
      }));
      expect(
        await repository.publish(
          lease,
          { ...lease.cursor, snapshots: [snapshot], coverage: [] },
          now + 1
        )
      ).toBe(true);
      const stored = await repository.read("synthetic", 0);
      expect(stored.snapshots).toHaveLength(1);
      expect(stored.history).toHaveLength(size);
      expect(stored.history.filter((h) => h.value === null)).toHaveLength(
        Math.ceil(size / 4)
      );
      expect(stored.sync.state).toBe("complete");
    }
  );
  it("rolls back snapshots and earlier history chunks when a later chunk fails", async () => {
    const repository = getUsageRepository();
    await db.run(
      sql`CREATE TRIGGER synthetic_cloudflare_usage_reject BEFORE INSERT ON cloudflare_usage_daily WHEN NEW.metric_id = 'synthetic:reject' BEGIN SELECT RAISE(ABORT, 'synthetic rejection'); END`
    );
    try {
      await repository.request("synthetic", now, "history-job", true);
      const lease = (await repository.claim("synthetic", now, "history-run"))!;
      const snapshot = syntheticSnapshot(now);
      snapshot.history = Array.from({ length: 15 }, (_, i) => ({
        ...snapshot.history[0],
        metricId: i === 14 ? "synthetic:reject" : `synthetic:metric-${i}`,
      }));
      await expect(
        repository.publish(
          lease,
          { ...lease.cursor, snapshots: [snapshot], coverage: [] },
          now + 1
        )
      ).rejects.toBeDefined();
      const stored = await repository.read("synthetic", 0);
      expect(stored.snapshots).toEqual([]);
      expect(stored.history).toEqual([]);
      expect(stored.sync.state).toBe("running");
    } finally {
      await db.run(
        sql`DROP TRIGGER IF EXISTS synthetic_cloudflare_usage_reject`
      );
    }
  });
  it("coalesces refreshes and enforces owner/generation/expiry on cursor and publish", async () => {
    const repository = getUsageRepository();
    const requests = await Promise.all([
      repository.request("a", now, "business-job", true),
      repository.request("a", now, "coalesced-job", true),
    ]);
    expect(requests[0].jobId).toBe(requests[1].jobId);
    const first = await repository.claim("a", now, "minute-run-a");
    expect(first).not.toBeNull();
    expect(await repository.claim("a", now, "minute-run-b")).toBeNull();
    const next: UsageCursor = {
      ...first!.cursor,
      step: 12,
      snapshots: [syntheticSnapshot(now)],
      coverage: [],
    };
    expect(await repository.publish(first!, next, now + LEASE_MS)).toBe(false);
    const second = await repository.claim("a", now + LEASE_MS, "minute-run-b");
    expect(second!.generation).toBe(first!.generation + 1);
    expect(await repository.checkpoint(first!, next, now + LEASE_MS)).toBe(
      false
    );
    expect(await repository.publish(first!, next, now + LEASE_MS)).toBe(false);
    expect((await repository.read("a", 0)).snapshots).toEqual([]);
    expect(await repository.publish(second!, next, now + LEASE_MS + 1)).toBe(
      true
    );
    expect((await repository.read("a", 0)).history).toHaveLength(1);
    expect((await repository.read("b", 0)).snapshots).toEqual([]);
    expect((await repository.read("a", 0)).sync.state).toBe("complete");
  });
  it("retains source snapshots across a failed cycle and cleans only this account's old history", async () => {
    const repository = getUsageRepository();
    await repository.request("a", now, "one", false);
    const lease = (await repository.claim("a", now, "run"))!;
    const old = syntheticSnapshot(now);
    old.history.push({ ...old.history[0], dayUtc: now - 91 * DAY_MS });
    await repository.publish(
      lease,
      { ...lease.cursor, snapshots: [old], coverage: [] },
      now + 1
    );
    expect((await repository.read("a", 0)).history).toHaveLength(1);
    await repository.request("a", now + DAY_MS, "two", false);
    const next = (await repository.claim("a", now + DAY_MS, "run-2"))!;
    await repository.publish(
      next,
      {
        ...next.cursor,
        snapshots: [],
        coverage: [
          {
            product: "billing-usage",
            status: "unavailable",
            reason: "permission_or_capability_denied",
          },
        ],
      },
      now + DAY_MS + 1
    );
    const stored = await repository.read("a", 0);
    expect(stored.snapshots).toHaveLength(1);
    expect(stored.sync.lastSuccessTimeUtc).toBe(now + 1);
    const overview = await readUsageOverview(
      { days: 7 },
      {
        now: now + DAY_MS,
        config: {
          accountId: "b",
          billingToken: "synthetic",
          analyticsToken: null,
        },
        repository,
      }
    );
    expect(overview.metrics).toEqual([]);
    expect(overview.history).toEqual([]);
    expect(overview.account?.id).toBe("b");
  });
  it("persists continuation atomically and makes manual cooldown durable", async () => {
    const repository = getUsageRepository();
    await repository.request("a", now, "job", true);
    const lease = (await repository.claim("a", now, "run"))!;
    const cursor: UsageCursor = {
      ...lease.cursor,
      step: 6,
      metadata: {
        plan: "unknown",
        cycleStart: null,
        cycleEnd: null,
        anchor: null,
        covered: true,
        subscriptionPage: 2,
        datasetNames: ["d1AnalyticsAdaptiveGroups"],
        analytics: {
          nextStartUtc: now,
          retainedStartUtc: now - DAY_MS,
          maxDurationMs: DAY_MS,
          pageLimit: 100,
          fields: ["rowsRead"],
          history: [],
        },
      },
    };
    expect(await repository.checkpoint(lease, cursor, now + 1)).toBe(true);
    const next = (await repository.claim("a", now + 2, "next-run"))!;
    expect(next.cursor).toEqual(cursor);
    expect(await repository.fail(next, [], now + 3, now + 120000)).toBe(true);
    expect(await repository.claim("a", now + 60000, "too-early")).toBeNull();
    expect(
      (await repository.request("a", now + 60000, "click", true)).jobId
    ).toBe("job");
    expect(await repository.claim("a", now + 120000, "later")).not.toBeNull();
  });
});
