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
import { withQuotaObservations } from "./quota-observation";
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
function cycleSnapshot(now: number, used = 80): SourceSnapshot {
  const snapshot = syntheticSnapshot(now);
  snapshot.metrics.push({
    id: "synthetic:known",
    product: "Synthetic",
    name: "Cycle requests",
    unit: "requests",
    used,
    limit: 100,
    remaining: Math.max(0, 100 - used),
    percentage: used,
    periodKind: "billing_cycle",
    periodStartUtc: Date.UTC(2026, 9, 1),
    periodEndUtc: Date.UTC(2026, 10, 1),
    resetTimeUtc: Date.UTC(2026, 10, 1),
    quotaKind: "included",
    source: "billing-v2",
    quality: "exact",
    status: "available",
    reason: null,
    collectedTimeUtc: now,
  });
  return snapshot;
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
  it("upserts measured observations once per UTC day while retaining raw daily values", async () => {
    const repository = getUsageRepository();
    const today = Date.UTC(2026, 9, 25);
    for (const [offset, total] of [
      [0, 80],
      [60001, 90],
      [DAY_MS, 100],
    ]) {
      const stamp = now + offset;
      await repository.request("observed", stamp, `job-${offset}`, true);
      const lease = (await repository.claim("observed", stamp, "run"))!;
      const snapshot = cycleSnapshot(stamp, total);
      snapshot.history.push(
        { ...snapshot.history[0] },
        {
          ...snapshot.history[0],
          kind: "cumulative_snapshot",
          value: 999,
        }
      );
      if (offset === DAY_MS)
        snapshot.history.push({
          metricId: "synthetic:known",
          dayUtc: today,
          kind: "cumulative_snapshot",
          source: "billing-v2",
          value: 999,
        });
      expect(
        await repository.publish(
          lease,
          withQuotaObservations({ ...lease.cursor, snapshots: [snapshot] }),
          stamp + 1
        )
      ).toBe(true);
    }
    const stored = await repository.read("observed", 0);
    expect(stored.snapshots).toHaveLength(1);
    expect(stored.history.filter((h) => h.kind === "daily_usage")).toHaveLength(
      2
    );
    expect(
      stored.history.filter((h) => h.kind === "cumulative_snapshot")
    ).toEqual([
      {
        metricId: "synthetic:known",
        dayUtc: today,
        kind: "cumulative_snapshot",
        value: 90,
        source: "quota-observation:billing-v2",
      },
      {
        metricId: "synthetic:known",
        dayUtc: today + DAY_MS,
        kind: "cumulative_snapshot",
        value: 100,
        source: "quota-observation:billing-v2",
      },
    ]);
    expect(stored.history).toHaveLength(4);
  });
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
      const snapshot = cycleSnapshot(now);
      snapshot.history = Array.from({ length: 15 }, (_, i) => ({
        ...snapshot.history[0],
        metricId: i === 14 ? "synthetic:reject" : `synthetic:metric-${i}`,
      }));
      await expect(
        repository.publish(
          lease,
          withQuotaObservations({
            ...lease.cursor,
            snapshots: [snapshot],
            coverage: [],
          }),
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
