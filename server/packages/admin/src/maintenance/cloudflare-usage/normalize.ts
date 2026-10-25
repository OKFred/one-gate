import type { UsageMetric, UsageCost } from "./model";
import {
  DAY_MS,
  numberOrNull,
  record,
  stringOrNull,
  type SourceSnapshot,
} from "./types";
import { applyQuota, type WorkersPlan } from "./rules";
import { UsageSourceError } from "./client";
export function time(value: unknown): number | null {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}
export function label(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim()
    ? Array.from(value)
        .filter(
          (character) =>
            character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127
        )
        .join("")
        .slice(0, 180)
    : fallback;
}
export function productName(value: unknown, meter: string): string {
  const name = label(value, "Other");
  if (/^(workers|workers standard|pages functions)$/i.test(name))
    return /requests/i.test(meter) ? "Workers / Pages Functions" : "Workers";
  if (/^(workers )?kv$/i.test(name)) return "KV";
  if (/^workers ai$/i.test(name)) return "Workers AI";
  if (/^browser (rendering|run)$/i.test(name)) return "Browser Run";
  return name;
}
export function decimal(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const raw = String(value);
  if (!/[eE]/.test(raw)) return raw;
  const [mantissa, exp] = raw.toLowerCase().split("e");
  const exponent = Number(exp);
  const negative = mantissa.startsWith("-");
  const digits = mantissa.replace("-", "").replace(".", "");
  const point = mantissa.replace("-", "").indexOf(".");
  const location = (point < 0 ? digits.length : point) + exponent;
  return `${negative ? "-" : ""}${location <= 0 ? `0.${"0".repeat(-location)}${digits}` : location >= digits.length ? `${digits}${"0".repeat(location - digits.length)}` : `${digits.slice(0, location)}.${digits.slice(location)}`}`;
}
export function sumDecimal(left: string, right: string): string {
  const scale = Math.max(
    left.split(".")[1]?.length ?? 0,
    right.split(".")[1]?.length ?? 0
  );
  const integer = (v: string) => {
    const [whole, fraction = ""] = v.split(".");
    return BigInt(`${whole}${fraction.padEnd(scale, "0")}`);
  };
  const total = integer(left) + integer(right);
  const negative = total < 0n;
  const digits = (negative ? -total : total)
    .toString()
    .padStart(scale + 1, "0");
  return `${negative ? "-" : ""}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
}
export function normalizeBilling(
  rows: unknown[],
  options: {
    accountId: string;
    source: "billing-v1" | "billing-v2" | "billing-cost-v2";
    now: number;
    cycleStart: number | null;
    cycleEnd: number | null;
    plan: WorkersPlan;
    costsOnly?: boolean;
    r2Standard?: boolean;
  }
): SourceSnapshot {
  const { source, now } = options;
  const result: SourceSnapshot = {
    source,
    accountName: null,
    collectedTimeUtc: now,
    metrics: [],
    costs: [],
    history: [],
    coverage: [],
  };
  const metrics = new Map<string, UsageMetric>();
  const costs = new Map<string, UsageCost>();
  for (const row of rows) {
    if (!record(row)) throw new UsageSourceError("invalid_response");
    // Contract-level records cannot establish account scope. Never attribute them to this account.
    if (row.BillingAccountId === undefined) {
      result.coverage.push({
        product: "Billing",
        status: "unmapped",
        reason: "contract_scope_not_attributable",
      });
      continue;
    }
    if (
      typeof row.BillingAccountId !== "string" ||
      row.BillingAccountId !== options.accountId
    )
      throw new UsageSourceError("account_mismatch");
    result.accountName ??= stringOrNull(row.BillingAccountName);
    const name = label(
      row.x_BillableMetricName ?? row.ServiceName ?? row.ChargeDescription,
      "Unnamed official meter"
    );
    const product = productName(
      row.x_ProductFamilyName ?? row.ServiceFamilyName ?? row.ServiceName,
      name
    );
    const implicitR2RequestUnit =
      product === "R2" &&
      /^r2 storage class [ab] operations \(first (1m|10m) included\)$/i.test(
        name
      );
    const unit = label(
      row.ConsumedUnit,
      implicitR2RequestUnit ? "requests" : "unknown"
    );
    const identity = label(
      row.x_BillableMetricId ?? row.ServiceName ?? row.ChargeDescription,
      name
    );
    const subscription = label(
      row.SubAccountId ?? row.SubscriptionId,
      "account"
    );
    const baseId = `billing:${encodeURIComponent(identity)}:${encodeURIComponent(unit)}:${encodeURIComponent(subscription)}`;
    const start = time(row.ChargePeriodStart);
    const end = time(row.ChargePeriodEnd);
    if (start === null || end === null || start >= end)
      throw new UsageSourceError("incomplete_window");
    const billingStart = time(row.BillingPeriodStart);
    const billingEnd =
      time(row.BillingPeriodEnd) ??
      (billingStart === options.cycleStart ? options.cycleEnd : null);
    const month = new Date(now);
    const monthStart = Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1);
    const monthEnd = Date.UTC(
      month.getUTCFullYear(),
      month.getUTCMonth() + 1,
      1
    );
    const periodStart = billingStart ?? monthStart;
    const periodEnd = billingEnd ?? (billingStart === null ? monthEnd : null);
    const id = `${baseId}:${periodStart}:${periodEnd ?? "unverified"}`;
    const periodVerified =
      billingStart !== null &&
      periodEnd !== null &&
      periodStart <= now &&
      periodEnd > now;
    const current =
      (billingStart === null || periodVerified) &&
      start >= periodStart &&
      (periodEnd === null || end <= periodEnd);
    const used = numberOrNull(row.ConsumedQuantity);
    if (!options.costsOnly) {
      result.history.push({
        metricId: id,
        dayUtc: Math.floor(start / DAY_MS) * DAY_MS,
        value: used,
        kind: end - start <= DAY_MS ? "daily_usage" : "cumulative_snapshot",
        source,
      });
      if (current) {
        const existing = metrics.get(id);
        const metric: UsageMetric = existing ?? {
          id,
          product,
          name,
          unit,
          used: 0,
          limit: null,
          remaining: null,
          percentage: null,
          periodKind:
            billingStart === null ? "calendar_month" : "billing_cycle",
          periodStartUtc: periodStart,
          periodEndUtc: periodEnd,
          resetTimeUtc: periodEnd,
          quotaKind: "unknown",
          source,
          quality: "exact",
          status: "available",
          reason:
            billingStart === null
              ? "calendar_month_reference;billing_cycle_unavailable"
              : "official_meter;quota_unmapped",
          collectedTimeUtc: now,
        };
        metric.used =
          metric.used === null || used === null ? null : metric.used + used;
        if (metric.used !== null && !Number.isFinite(metric.used))
          throw new UsageSourceError("invalid_quantity");
        metrics.set(id, metric);
      } else if (!metrics.has(id)) {
        metrics.set(id, {
          id,
          product,
          name,
          unit,
          used: null,
          limit: null,
          remaining: null,
          percentage: null,
          periodKind:
            billingStart === null ? "calendar_month" : "billing_cycle",
          periodStartUtc: periodStart,
          periodEndUtc: periodEnd,
          resetTimeUtc: null,
          quotaKind: "unknown",
          source,
          quality: "unknown",
          status:
            periodEnd !== null && periodEnd <= now
              ? "historical"
              : "period_unknown",
          reason: "current_billing_cycle_unverified;usage_retained_in_history",
          collectedTimeUtc: now,
        });
      }
    }
    const costBasis =
      numberOrNull(row.BilledCost) !== null
        ? "billed"
        : numberOrNull(row.ContractedCost) !== null
          ? "contracted"
          : numberOrNull(row.EffectiveCost) !== null
            ? "effective"
            : null;
    const amount = decimal(
      costBasis === "billed"
        ? row.BilledCost
        : costBasis === "contracted"
          ? row.ContractedCost
          : costBasis === "effective"
            ? row.EffectiveCost
            : undefined
    );
    const currency =
      typeof row.BillingCurrency === "string" &&
      /^[A-Z]{3}$/.test(row.BillingCurrency)
        ? row.BillingCurrency
        : null;
    if (current && periodVerified && amount !== null && currency !== null) {
      const costId = `${id}:${currency}:${periodStart}:${periodEnd}:${costBasis}`;
      const previous = costs.get(costId);
      costs.set(costId, {
        id: costId,
        product,
        currency,
        amount: previous ? sumDecimal(previous.amount, amount) : amount,
        periodStartUtc: periodStart,
        periodEndUtc: periodEnd,
        source,
        status: `official_usage_cost_${costBasis}`,
      });
    }
  }
  const daily = new Map<string, (typeof result.history)[number]>();
  for (const h of result.history) {
    const key = `${h.metricId}:${h.dayUtc}:${h.kind}`;
    const previous = daily.get(key);
    if (previous)
      previous.value =
        previous.value === null || h.value === null
          ? null
          : previous.value + h.value;
    else daily.set(key, { ...h });
  }
  result.history = [...daily.values()];
  result.metrics = [...metrics.values()].map((m) =>
    applyQuota(
      m,
      m.product === "R2" && options.r2Standard ? "standard" : options.plan
    )
  );
  // A shared allowance cannot be repeated for multiple subscription/meter rows.
  for (const metric of result.metrics)
    if (
      metric.product === "Workers / Pages Functions" &&
      metric.limit !== null
    ) {
      const pool = result.metrics.filter(
        (m) =>
          m.product === metric.product &&
          m.unit === metric.unit &&
          m.periodStartUtc !== null &&
          m.periodEndUtc !== null &&
          m.periodStartUtc <= now &&
          m.periodEndUtc > now
      );
      if (pool.length > 1) {
        metric.limit = null;
        metric.remaining = null;
        metric.percentage = null;
        metric.quotaKind = "unknown";
        metric.reason = "shared_pool_ambiguous;allowance_not_repeated";
      }
    }
  result.costs = [...costs.values()];
  result.coverage.push({
    product: source.includes("cost") ? "Billing costs" : "Billing usage",
    status: rows.length ? "available" : "empty",
    reason: rows.length ? null : "no_meter_records;not_zero_usage",
  });
  return result;
}
