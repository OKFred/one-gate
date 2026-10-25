import type { UsageHistory, UsageMetric } from "./model";
import { DAY_MS, type UsageCursor } from "./types";

export const QUOTA_OBSERVATION_SOURCE_PREFIX = "quota-observation:";

function reliableCurrentPeriod(metric: UsageMetric): boolean {
  return (
    ["billing_cycle", "calendar_month"].includes(metric.periodKind) &&
    metric.status === "available" &&
    !["unknown", "reference"].includes(metric.quality) &&
    !metric.reason?.split(";").includes("calendar_month_reference") &&
    metric.used !== null &&
    Number.isFinite(metric.used) &&
    Number.isSafeInteger(metric.collectedTimeUtc) &&
    metric.periodStartUtc !== null &&
    Number.isSafeInteger(metric.periodStartUtc) &&
    metric.periodEndUtc !== null &&
    Number.isSafeInteger(metric.periodEndUtc) &&
    metric.periodStartUtc <= metric.collectedTimeUtc &&
    metric.collectedTimeUtc < metric.periodEndUtc &&
    metric.source.trim().length > 0
  );
}

const historyKey = (point: UsageHistory) =>
  JSON.stringify([point.metricId, point.dayUtc, point.kind]);

/** Record measured cycle totals at observation time, never at charge-window start. */
export function withQuotaObservations(cursor: UsageCursor): UsageCursor {
  return {
    ...cursor,
    snapshots: cursor.snapshots.map((snapshot) => {
      // The history primary key excludes source. Deduplicate before a PG VALUES UPSERT.
      const history = new Map(
        snapshot.history.map((point) => [historyKey(point), { ...point }])
      );
      const observations = new Map<
        string,
        { collectedTimeUtc: number; point: UsageHistory }
      >();
      for (const metric of snapshot.metrics) {
        if (!reliableCurrentPeriod(metric)) continue;
        const point: UsageHistory = {
          metricId: metric.id,
          dayUtc: Math.floor(metric.collectedTimeUtc / DAY_MS) * DAY_MS,
          kind: "cumulative_snapshot",
          value: metric.used,
          source: `${QUOTA_OBSERVATION_SOURCE_PREFIX}${metric.source}`,
        };
        const key = historyKey(point);
        if (
          (observations.get(key)?.collectedTimeUtc ?? -Infinity) >
          metric.collectedTimeUtc
        )
          continue;
        observations.set(key, {
          collectedTimeUtc: metric.collectedTimeUtc,
          point,
        });
      }
      for (const [key, observation] of observations)
        history.set(key, observation.point);
      return { ...snapshot, history: [...history.values()] };
    }),
  };
}
