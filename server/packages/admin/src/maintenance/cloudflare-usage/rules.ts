import type { UsageMetric } from "./model";
export type WorkersPlan = "free" | "standard" | "unknown";
export interface QuotaRule {
  id: string;
  product: string;
  meter: RegExp;
  unit: RegExp;
  free: number | null;
  standard: number | null;
  period: "day" | "billing_cycle";
  source: string;
  effectiveDate: string;
  version: string;
  sharedPool?: string;
}
const rule = (
  value: Omit<QuotaRule, "effectiveDate" | "version">
): QuotaRule => ({
  ...value,
  effectiveDate: "2026-10-25",
  version: "2026-10-25.1",
});
export const QUOTA_RULES: readonly QuotaRule[] = [
  rule({
    id: "workers.requests",
    product: "Workers / Pages Functions",
    meter: /^(workers(?: standard)? requests|requests)(?: \(analytics\))?$/i,
    unit: /^(requests|count)$/i,
    free: 100000,
    standard: 10000000,
    period: "billing_cycle",
    sharedPool: "workers-pages-functions",
    source: "https://developers.cloudflare.com/workers/platform/pricing/",
  }),
  rule({
    id: "workers.cpu",
    product: "Workers",
    meter: /^workers(?: standard)? cpu (?:time|milliseconds)$/i,
    unit: /^(ms|milliseconds)$/i,
    free: null,
    standard: 30000000,
    period: "billing_cycle",
    source: "https://developers.cloudflare.com/workers/platform/pricing/",
  }),
  rule({
    id: "d1.rows_read",
    product: "D1",
    meter: /^(?:d1 )?rows read$/i,
    unit: /^(rows|count)$/i,
    free: 5000000,
    standard: 25000000000,
    period: "billing_cycle",
    source: "https://developers.cloudflare.com/d1/platform/pricing/",
  }),
  rule({
    id: "d1.rows_written",
    product: "D1",
    meter: /^(?:d1 )?rows written$/i,
    unit: /^(rows|count)$/i,
    free: 100000,
    standard: 50000000,
    period: "billing_cycle",
    source: "https://developers.cloudflare.com/d1/platform/pricing/",
  }),
  ...(["read", "write", "delete", "list"] as const).map((action) =>
    rule({
      id: `kv.${action}`,
      product: "KV",
      meter: new RegExp(
        `^(?:workers )?kv (?:${action}(?:s)?|keys ${action === "write" ? "written" : action === "delete" ? "deleted" : action}|${action} requests)$`,
        "i"
      ),
      unit: /^(keys|requests|count|operations)$/i,
      free: action === "read" ? 100000 : 1000,
      standard: action === "read" ? 10000000 : 1000000,
      period: "billing_cycle",
      source: "https://developers.cloudflare.com/kv/platform/pricing/",
    })
  ),
  rule({
    id: "r2.class_a",
    product: "R2",
    meter:
      /^(r2 standard class a operations|r2 storage class a operations \(first 1m included\))$/i,
    unit: /^(requests|operations|count)$/i,
    free: 1000000,
    standard: 1000000,
    period: "billing_cycle",
    source: "https://developers.cloudflare.com/r2/pricing/",
  }),
  rule({
    id: "r2.class_b",
    product: "R2",
    meter:
      /^(r2 standard class b operations|r2 storage class b operations \(first 10m included\))$/i,
    unit: /^(requests|operations|count)$/i,
    free: 10000000,
    standard: 10000000,
    period: "billing_cycle",
    source: "https://developers.cloudflare.com/r2/pricing/",
  }),
  rule({
    id: "r2.storage",
    product: "R2",
    meter:
      /^(r2 standard storage|r2 data storage \(first 10gb-month included\))$/i,
    unit: /^gb-months?$/i,
    free: 10,
    standard: 10,
    period: "billing_cycle",
    source: "https://developers.cloudflare.com/r2/pricing/",
  }),
  rule({
    id: "queues.operations",
    product: "Queues",
    meter: /^(?:queues )?(?:standard |billable )?operations$/i,
    unit: /^(operations|count)$/i,
    free: 10000,
    standard: 1000000,
    period: "billing_cycle",
    source: "https://developers.cloudflare.com/queues/platform/pricing/",
  }),
  rule({
    id: "ai.neurons",
    product: "Workers AI",
    meter: /^(?:workers ai )?neurons$/i,
    unit: /^neurons$/i,
    free: 10000,
    standard: 10000,
    period: "day",
    source: "https://developers.cloudflare.com/workers-ai/platform/pricing/",
  }),
  rule({
    id: "do.requests",
    product: "Durable Objects",
    meter: /^(?:durable objects )?requests$/i,
    unit: /^(requests|count)$/i,
    free: 100000,
    standard: 1000000,
    period: "billing_cycle",
    source:
      "https://developers.cloudflare.com/durable-objects/platform/pricing/",
  }),
  rule({
    id: "browser.hours",
    product: "Browser Run",
    meter: /^(?:browser (?:run|rendering) )?(?:browser )?hours$/i,
    unit: /^(hours|browser-hours)$/i,
    free: null,
    standard: 10,
    period: "billing_cycle",
    source:
      "https://developers.cloudflare.com/browser-rendering/platform/pricing/",
  }),
];
export function applyQuota(
  metric: UsageMetric,
  plan: WorkersPlan
): UsageMetric {
  if (plan === "unknown") return metric;
  const match = QUOTA_RULES.find(
    (r) =>
      r.product === metric.product &&
      r.meter.test(metric.name) &&
      r.unit.test(metric.unit)
  );
  if (!match) return metric;
  const period =
    match.period === "day" || (plan === "free" && !match.id.startsWith("r2."))
      ? "day"
      : "billing_cycle";
  const limit = plan === "free" ? match.free : match.standard;
  // Only compare an authoritative quota against its matching complete measurement window.
  if (
    limit === null ||
    metric.periodKind !== period ||
    metric.periodStartUtc === null ||
    metric.periodEndUtc === null
  )
    return metric;
  return {
    ...metric,
    limit,
    remaining: metric.used === null ? null : Math.max(0, limit - metric.used),
    percentage: metric.used === null ? null : (metric.used / limit) * 100,
    quotaKind: plan === "free" && period === "day" ? "hard" : "included",
    reason: `quota_rule:${match.id}@${match.version};${match.source}${match.sharedPool ? `;shared_pool:${match.sharedPool}` : ""}`,
  };
}
