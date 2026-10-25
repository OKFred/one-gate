import { describe, expect, it } from "vitest";
import type { UsageMetric } from "./model";
import { withQuotaObservations } from "./quota-observation";
import { DAY_MS, type UsageCursor } from "./types";

const now = Date.UTC(2026, 9, 25, 12);
const today = Date.UTC(2026, 9, 25);
const start = Date.UTC(2026, 9, 1);
const end = Date.UTC(2026, 10, 1);

function metric(change: Partial<UsageMetric> = {}): UsageMetric {
  return {
    id: "synthetic:cycle",
    product: "Synthetic",
    name: "Cycle requests",
    unit: "requests",
    used: 80,
    limit: 100,
    remaining: 20,
    percentage: 80,
    periodKind: "billing_cycle",
    periodStartUtc: start,
    periodEndUtc: end,
    resetTimeUtc: end,
    quotaKind: "included",
    source: "billing-v1",
    quality: "exact",
    status: "available",
    reason: null,
    collectedTimeUtc: now,
    ...change,
  };
}

function cursor(metrics: UsageMetric[] = [metric()]): UsageCursor {
  return {
    version: 1,
    step: 12,
    startedTimeUtc: now,
    coverage: [],
    snapshots: [
      {
        source: "billing-usage",
        accountName: null,
        metrics,
        costs: [],
        coverage: [],
        collectedTimeUtc: now,
        history: [
          {
            metricId: "synthetic:cycle",
            dayUtc: today - DAY_MS,
            value: 4,
            kind: "daily_usage",
            source: "billing-v1",
          },
          {
            metricId: "synthetic:cycle",
            dayUtc: start,
            value: 50,
            kind: "cumulative_snapshot",
            source: "billing-v1",
          },
        ],
      },
    ],
  };
}

describe("cycle quota observations", () => {
  it("keeps raw history distinct and observes the total at collection day without mutating the cursor", () => {
    const input = cursor();
    const before = structuredClone(input);
    const result = withQuotaObservations(input);
    expect(input).toEqual(before);
    expect(result.snapshots[0].history).toEqual([
      ...before.snapshots[0].history,
      {
        metricId: "synthetic:cycle",
        dayUtc: today,
        value: 80,
        kind: "cumulative_snapshot",
        source: "quota-observation:billing-v1",
      },
    ]);
    expect(withQuotaObservations(result)).toEqual(result);
  });

  it("deduplicates primary keys and lets a measured observation replace a raw cumulative value on the same day", () => {
    const input = cursor();
    const original = input.snapshots[0].history[0];
    input.snapshots[0].history.push(
      { ...original, value: 6 },
      {
        metricId: "synthetic:cycle",
        dayUtc: today,
        value: 999,
        kind: "cumulative_snapshot",
        source: "billing-v1",
      }
    );
    const history = withQuotaObservations(input).snapshots[0].history;
    expect(history).toHaveLength(3);
    expect(history.find((h) => h.kind === "daily_usage")?.value).toBe(6);
    expect(history.find((h) => h.dayUtc === today)).toMatchObject({
      source: "quota-observation:billing-v1",
      value: 80,
    });
  });

  it("selects the newest observation for a duplicated metric and uses its own UTC collection day", () => {
    const later = Date.UTC(2026, 9, 26, 0, 0, 1);
    const input = cursor([
      metric({ collectedTimeUtc: later, used: 90 }),
      metric({ collectedTimeUtc: later - 1, used: 85 }),
    ]);
    const history = withQuotaObservations(input).snapshots[0].history;
    expect(history.at(-1)).toMatchObject({
      dayUtc: Date.UTC(2026, 9, 26),
      value: 90,
      source: "quota-observation:billing-v1",
    });
  });

  it.each(["billing_cycle", "calendar_month"] as const)(
    "records reliable %s totals even when the allowance is unknown, without inventing zero",
    (periodKind) => {
      const input = cursor([
        metric({
          periodKind,
          used: 0,
          limit: null,
          remaining: null,
          percentage: null,
          quotaKind: "unknown",
          quality: "estimated",
        }),
      ]);
      expect(
        withQuotaObservations(input).snapshots[0].history.at(-1)
      ).toMatchObject({
        value: 0,
        source: "quota-observation:billing-v1",
      });
    }
  );

  const invalid: { name: string; change: Partial<UsageMetric> }[] = [
    { name: "daily usage", change: { periodKind: "day" } },
    { name: "instant capacity", change: { periodKind: "instant" } },
    { name: "unknown quality", change: { quality: "unknown" } },
    { name: "reference quality", change: { quality: "reference" } },
    {
      name: "unverified calendar-month reference aggregate",
      change: {
        periodKind: "calendar_month",
        quality: "exact",
        reason: "calendar_month_reference;billing_cycle_unavailable",
      },
    },
    { name: "stale snapshot", change: { status: "stale" } },
    { name: "null quantity", change: { used: null } },
    { name: "nonfinite quantity", change: { used: Infinity } },
    { name: "NaN quantity", change: { used: NaN } },
    { name: "missing period start", change: { periodStartUtc: null } },
    { name: "missing period end", change: { periodEndUtc: null } },
    { name: "expired period", change: { periodEndUtc: now - 1 } },
    { name: "exclusive period end", change: { periodEndUtc: now } },
    { name: "future period", change: { periodStartUtc: now + 1 } },
    { name: "invalid period", change: { periodStartUtc: end } },
    { name: "nonfinite collection time", change: { collectedTimeUtc: NaN } },
    { name: "empty source", change: { source: " " } },
  ];
  it.each(invalid)(
    "does not fabricate an observation for $name",
    ({ change }) => {
      const input = cursor([metric(change)]);
      expect(withQuotaObservations(input).snapshots[0].history).toEqual(
        input.snapshots[0].history
      );
    }
  );
});
