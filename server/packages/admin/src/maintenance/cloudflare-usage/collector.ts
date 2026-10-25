import {
  CloudflareUsageClient,
  UsageSourceError,
  type Fetcher,
  type UsageConfiguration,
} from "./client";
import { getUsageConfiguration } from "./service";
import { classifySafeErrorCause } from "@hodor/core/utils/safe-error-cause";
import { getUsageRepository } from "./repository";
import { withQuotaObservations } from "./quota-observation";
import {
  ANALYTICS_ADAPTERS,
  advanceAnalytics,
  discoverAnalytics,
} from "./analytics";
import { normalizeBilling, time } from "./normalize";
import {
  DAY_MS,
  record,
  type UsageCursor,
  type UsageRepository,
  type SourceSnapshot,
} from "./types";

function metadata(cursor: UsageCursor) {
  return (cursor.metadata ??= {
    plan: "unknown",
    cycleStart: null,
    cycleEnd: null,
    anchor: null,
    covered: null,
    subscriptionPage: 1,
    datasetNames: [],
  });
}
async function subscriptions(
  client: CloudflareUsageClient,
  cursor: UsageCursor,
  now: number
): Promise<boolean> {
  const m = metadata(cursor);
  const response = await client.request(
    `/accounts/${client.config.accountId}/subscriptions${m.subscriptionPage === 1 ? "" : `?page=${m.subscriptionPage}`}`,
    "billing",
    { now }
  );
  if (!Array.isArray(response.result))
    throw new UsageSourceError("invalid_response");
  for (const item of response.result) {
    if (
      !record(item) ||
      !record(item.rate_plan) ||
      !["Paid", "Provisioned", "Trial"].includes(String(item.state))
    )
      continue;
    const plan = item.rate_plan;
    if (plan.scope === "zone") continue;
    if (
      plan.is_contract === false &&
      plan.externally_managed !== true &&
      plan.public_name === "R2 Paid"
    )
      m.r2Standard = true;
    const periodStart = time(item.current_period_start);
    const periodEnd = time(item.current_period_end);
    if (
      periodStart !== null &&
      periodEnd !== null &&
      periodStart <= now &&
      periodEnd > now &&
      !cursor.coverage.some(
        (c) => c.reason === "multiple_account_billing_cycles"
      )
    ) {
      if (
        m.cycleStart !== null &&
        (m.cycleStart !== periodStart || m.cycleEnd !== periodEnd)
      ) {
        m.cycleStart = null;
        m.cycleEnd = null;
        cursor.coverage.push({
          product: "Billing cycle",
          status: "unmapped",
          reason: "multiple_account_billing_cycles",
        });
      } else {
        m.cycleStart = periodStart;
        m.cycleEnd = periodEnd;
      }
    }
    const name =
      typeof plan.public_name === "string"
        ? plan.public_name.toLowerCase().trim()
        : "";
    if (!/\bworkers\b/.test(name)) continue;
    // A zone Free/Pro/Business subscription does not establish a Workers plan.
    if (
      plan.is_contract === true ||
      plan.externally_managed === true ||
      /enterprise|contract|bundled|unbound/.test(name)
    ) {
      m.plan = "unknown";
      cursor.coverage.push({
        product: "Quota rules",
        status: "unmapped",
        reason: "custom_or_legacy_workers_plan",
      });
      continue;
    }
    const known =
      name === "workers paid" ||
      name === "workers standard" ||
      name === "workers paid plan"
        ? "standard"
        : name === "workers free" || name === "workers free plan"
          ? "free"
          : "unknown";
    if (known === "unknown") {
      cursor.coverage.push({
        product: "Quota rules",
        status: "unmapped",
        reason: "custom_or_legacy_workers_plan",
      });
      continue;
    }
    if (m.plan !== "unknown" && m.plan !== known)
      cursor.coverage.push({
        product: "Quota rules",
        status: "unmapped",
        reason: "multiple_workers_plans",
      });
    if (
      !cursor.coverage.some((c) =>
        ["custom_or_legacy_workers_plan", "multiple_workers_plans"].includes(
          c.reason ?? ""
        )
      )
    )
      m.plan = known;
  }
  const info = response.result_info;
  if (
    cursor.coverage.some((c) =>
      ["custom_or_legacy_workers_plan", "multiple_workers_plans"].includes(
        c.reason ?? ""
      )
    )
  )
    m.plan = "unknown";
  if (record(info) && typeof info.total_count === "number") {
    const perPage = typeof info.per_page === "number" ? info.per_page : 20;
    if (typeof info.page === "number" && info.page !== m.subscriptionPage)
      throw new UsageSourceError("pagination_incomplete");
    if (info.total_count > m.subscriptionPage * perPage) {
      if (m.subscriptionPage >= 5 || response.result.length === 0)
        throw new UsageSourceError("pagination_incomplete");
      m.subscriptionPage += 1;
      return false;
    }
  } else if (response.result.length >= 20)
    throw new UsageSourceError("pagination_incomplete");
  cursor.coverage.push({
    product: "Subscriptions",
    status: "available",
    reason:
      m.plan === "unknown"
        ? "workers_plan_unmapped;quotas_remain_unknown"
        : null,
  });
  return true;
}
async function billingInfo(
  client: CloudflareUsageClient,
  cursor: UsageCursor,
  now: number
) {
  const response = await client.request(
    `/accounts/${client.config.accountId}/billable-usage/info`,
    "billing",
    { now }
  );
  const info = response.result;
  if (
    !record(info) ||
    typeof info.covered !== "boolean" ||
    !Array.isArray(info.subscriptions)
  )
    throw new UsageSourceError("invalid_response");
  const m = metadata(cursor);
  m.covered = info.covered;
  const anchors = info.subscriptions
    .flatMap((s) =>
      record(s) && s.end_timestamp === undefined
        ? [time(s.billing_cycle_anchor_timestamp)]
        : []
    )
    .filter((v): v is number => v !== null);
  m.anchor = anchors.length === 1 ? anchors[0] : null;
  cursor.coverage.push({
    product: "Billing coverage",
    status: info.covered ? "available" : "api_unavailable",
    reason: info.covered
      ? m.anchor === null
        ? "billing_anchor_missing_or_ambiguous"
        : null
      : "account_not_covered_by_billable_usage",
  });
}
function checkedRows(response: Record<string, unknown>): unknown[] {
  if (!Array.isArray(response.result))
    throw new UsageSourceError("invalid_response");
  if (record(response.result_info)) {
    const info = response.result_info;
    if (
      (typeof info.total_count === "number" &&
        info.total_count > response.result.length) ||
      info.cursor ||
      (typeof info.total_pages === "number" && info.total_pages > 1)
    )
      throw new UsageSourceError("pagination_incomplete");
  }
  if (response.result.length >= 10000)
    throw new UsageSourceError("pagination_incomplete");
  return response.result;
}
async function billing(
  client: CloudflareUsageClient,
  cursor: UsageCursor,
  now: number,
  costsOnly: boolean
): Promise<SourceSnapshot> {
  const m = metadata(cursor);
  const today = Math.floor(cursor.startedTimeUtc / DAY_MS) * DAY_MS;
  const from = Math.min(today - 29 * DAY_MS, m.cycleStart ?? today);
  if (today - from > 30 * DAY_MS)
    throw new UsageSourceError("billing_window_exceeds_v2_limit");
  const query = `from=${new Date(from).toISOString().slice(0, 10)}&to=${new Date(today).toISOString().slice(0, 10)}`;
  let rows: unknown[];
  let source: "billing-v2" | "billing-v1" | "billing-cost-v2" = costsOnly
    ? "billing-cost-v2"
    : "billing-v2";
  try {
    rows = checkedRows(
      await client.request(
        `/accounts/${client.config.accountId}/billable/usage?${query}`,
        "billing",
        {
          method: costsOnly ? "POST" : "GET",
          body: costsOnly ? { Metric: "cost" } : undefined,
          now,
        }
      )
    );
  } catch (error) {
    if (
      !(error instanceof UsageSourceError) ||
      ![
        "permission_or_capability_denied",
        "api_unavailable",
        "provider_rejected",
      ].includes(error.code)
    )
      throw error;
    cursor.coverage.push({
      product: costsOnly ? "Billable V2 costs" : "Billable V2 usage",
      status: "api_unavailable",
      reason: error.code,
    });
    // An explicit official current period includes the anchor day required by V1.
    const v1Query =
      m.cycleStart === null
        ? ""
        : `?from=${new Date(m.cycleStart).toISOString().slice(0, 10)}&to=${new Date(today).toISOString().slice(0, 10)}`;
    rows = checkedRows(
      await client.request(
        `/accounts/${client.config.accountId}/billable-usage${v1Query}`,
        "billing",
        { now }
      )
    );
    source = "billing-v1";
    if (!rows.length) throw new UsageSourceError("v1_empty_not_zero");
  }
  const result = normalizeBilling(rows, {
    accountId: client.config.accountId ?? "",
    source,
    now,
    cycleStart: m.cycleStart,
    cycleEnd: m.cycleEnd,
    plan: m.plan,
    costsOnly,
    r2Standard: m.r2Standard === true,
  });
  result.source = costsOnly ? "billing-cost" : "billing-usage";
  if (!costsOnly) result.costs = [];
  if (costsOnly && !result.costs.length)
    result.coverage.push({
      product: "Billing costs",
      status: "unavailable",
      reason: "rated_cost_or_currency_absent;not_zero_cost",
    });
  return result;
}
const STEPS = 5 + ANALYTICS_ADAPTERS.length;
async function advance(
  client: CloudflareUsageClient,
  cursor: UsageCursor,
  now: number
): Promise<void> {
  if (cursor.step === 0) {
    if (await subscriptions(client, cursor, now)) cursor.step++;
    return;
  }
  if (cursor.step === 1) await billingInfo(client, cursor, now);
  else if (cursor.step === 2 || cursor.step === 3) {
    const result = await billing(client, cursor, now, cursor.step === 3);
    cursor.snapshots.push(result);
    cursor.coverage.push(...result.coverage);
  } else if (cursor.step === 4) {
    metadata(cursor).datasetNames = await discoverAnalytics(client, now);
    cursor.coverage.push(
      {
        product: "Workers AI",
        status: "billing_only",
        reason:
          "no_verified_account_wide_neuron_analytics_adapter;application_tokens_not_neurons",
      },
      {
        product: "Browser Run",
        status: "billing_only",
        reason: "official_billable_meter_only;no_session_or_content_reads",
      }
    );
  } else {
    const adapter = ANALYTICS_ADAPTERS[cursor.step - 5];
    if (adapter) {
      const result = await advanceAnalytics(client, adapter, cursor, now);
      if (!result) return;
      cursor.snapshots.push(result);
      cursor.coverage.push(...result.coverage);
    }
  }
  cursor.step++;
}
function stepProduct(step: number): string {
  return step === 0
    ? "Subscriptions"
    : step === 1
      ? "Billing coverage"
      : step === 2
        ? "billing-usage"
        : step === 3
          ? "billing-cost"
          : step === 4
            ? "Analytics discovery"
            : `analytics:${ANALYTICS_ADAPTERS[step - 5]?.dataset ?? "unknown"}`;
}
export interface CloudflareUsageMaintenanceInput {
  runId: string;
  now?: number;
  config?: UsageConfiguration;
  repository?: UsageRepository;
  fetcher?: Fetcher;
  onEvent?: (event: Record<string, string | number | null>) => void;
}
export interface CloudflareUsageMaintenanceResult {
  runId: string;
  jobId: string | null;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  pendingCount: number;
  durationMs: number;
  state:
    | "unconfigured"
    | "idle"
    | "pending"
    | "complete"
    | "partial"
    | "fenced";
  retryTimeUtc: number | null;
}
export async function runCloudflareUsageMaintenance(
  input: CloudflareUsageMaintenanceInput
): Promise<CloudflareUsageMaintenanceResult> {
  const start = performance.now();
  const now = input.now ?? Date.now();
  const config = input.config ?? getUsageConfiguration();
  const result: CloudflareUsageMaintenanceResult = {
    runId: input.runId,
    jobId: null,
    processedCount: 0,
    succeededCount: 0,
    failedCount: 0,
    pendingCount: 0,
    durationMs: 0,
    state: "idle",
    retryTimeUtc: null,
  };
  if (!config.accountId || (!config.analyticsToken && !config.billingToken))
    return { ...result, state: "unconfigured" };
  const repository = input.repository ?? getUsageRepository();
  await repository.request(config.accountId, now, crypto.randomUUID(), false);
  const event =
    input.onEvent ??
    ((data: Record<string, string | number | null>) =>
      console.info(JSON.stringify(data)));
  const finish = () => {
    result.durationMs = Math.floor(performance.now() - start);
    if (result.processedCount)
      event({ event: "cloudflare_usage_maintenance", ...result });
    return result;
  };
  // Each iteration durably checkpoints and reclaims with a new fencing generation.
  // Both HTTP time and advance count are bounded; no database transaction spans HTTP.
  const client = new CloudflareUsageClient(
    config,
    input.fetcher,
    start + 14_000
  );
  for (
    let batch = 0;
    batch < 6 && performance.now() - start < 13_500;
    batch++
  ) {
    const tickNow = now + Math.floor(performance.now() - start);
    const lease = await repository.claim(
      config.accountId,
      tickNow,
      input.runId
    );
    if (!lease) return finish();
    result.jobId = lease.jobId;
    const cursor = lease.cursor;
    result.processedCount++;
    try {
      await advance(client, cursor, tickNow);
      result.succeededCount++;
    } catch (error) {
      const code =
        error instanceof UsageSourceError ? error.code : "collector_failed";
      if (code === "tick_budget_exhausted") {
        const accepted = await repository.checkpoint(
          lease,
          cursor,
          now + Math.floor(performance.now() - start)
        );
        result.state = accepted ? "pending" : "fenced";
        result.pendingCount = 1;
        return finish();
      }
      result.failedCount++;
      event({
        event: "cloudflare_usage_source_failure",
        runId: input.runId,
        jobId: lease.jobId,
        source: stepProduct(cursor.step),
        code,
      });
      const temporary = [
        "rate_limited",
        "timeout",
        "network_error",
        "provider_unavailable",
      ].includes(code);
      if (temporary && lease.attempts < 3) {
        const retry = Math.max(
          tickNow + Math.min(15 * 60_000, 60_000 * 2 ** lease.attempts),
          error instanceof UsageSourceError ? (error.retryTimeUtc ?? 0) : 0
        );
        const accepted = await repository.fail(
          lease,
          [
            ...cursor.coverage,
            {
              product: stepProduct(cursor.step),
              status: "retrying",
              reason: code,
            },
          ],
          now + Math.floor(performance.now() - start),
          retry
        );
        result.state = accepted ? "pending" : "fenced";
        result.pendingCount = 1;
        result.retryTimeUtc = retry;
        return finish();
      }
      cursor.coverage.push({
        product: stepProduct(cursor.step),
        status:
          code === "not_configured"
            ? "not_configured"
            : code === "permission_or_capability_denied"
              ? "permission_or_capability_denied"
              : "unavailable",
        reason: code,
      });
      delete metadata(cursor).analytics;
      if (cursor.step === 0) {
        metadata(cursor).plan = "unknown";
        metadata(cursor).cycleStart = null;
        metadata(cursor).cycleEnd = null;
      }
      cursor.step++;
    }
    const complete = cursor.step >= STEPS;
    let accepted: boolean;
    if (complete) {
      try {
        accepted = await repository.publish(
          lease,
          withQuotaObservations(cursor),
          now + Math.floor(performance.now() - start)
        );
      } catch (error: unknown) {
        const causeCode = classifySafeErrorCause(error);
        event({
          event: "cloudflare_usage_publication_failed",
          stage: "publish",
          runId: input.runId,
          jobId: lease.jobId,
          causeCode,
        });
        const failureTime = now + Math.floor(performance.now() - start);
        const retryTime =
          failureTime +
          Math.min(15 * 60_000, 60_000 * 2 ** Math.min(lease.attempts, 4));
        const recorded = await repository.fail(
          lease,
          [
            ...cursor.coverage,
            { product: "Persistence", status: "retrying", reason: causeCode },
          ],
          failureTime,
          retryTime
        );
        result.failedCount++;
        result.state = recorded ? "pending" : "fenced";
        result.pendingCount = 1;
        result.retryTimeUtc = recorded ? retryTime : null;
        return finish();
      }
    } else {
      accepted = await repository.checkpoint(
        lease,
        cursor,
        now + Math.floor(performance.now() - start)
      );
    }
    result.state = !accepted
      ? "fenced"
      : complete
        ? cursor.coverage.some(
            (c) => c.status !== "available" && c.status !== "reference"
          )
          ? "partial"
          : "complete"
        : "pending";
    result.pendingCount = complete ? 0 : 1;
    if (!accepted || complete) return finish();
  }
  return finish();
}
