import type { API } from "@hodor/core/middleware/encapsulation";
import { bodyAdapter } from "@hodor/core/middleware/encapsulation/adapter";
import { getEnv } from "@hodor/core/utils/env";
import {
  UsageOverviewRequestSchema,
  UsageOverviewResponseSchema,
  UsageRefreshRequestSchema,
  UsageRefreshResponseSchema,
  type UsageOverviewRequest,
  type UsageOverview,
  type UsageRefresh,
} from "./model";
import type { UsageConfiguration } from "./client";
import { getUsageRepository } from "./repository";
import { DAY_MS, INTERVAL_MS, type UsageRepository } from "./types";
export function getUsageConfiguration(): UsageConfiguration {
  const accountId = getEnv("CF_USAGE_ACCOUNT_ID")?.trim();
  return {
    accountId:
      accountId && /^[a-f0-9]{32}$/i.test(accountId) ? accountId : null,
    analyticsToken: getEnv("CF_USAGE_ANALYTICS_TOKEN")?.trim() || null,
    billingToken: getEnv("CF_USAGE_BILLING_TOKEN")?.trim() || null,
  };
}
export async function readUsageOverview(
  params: UsageOverviewRequest,
  options: {
    now?: number;
    config?: UsageConfiguration;
    repository?: UsageRepository;
  } = {}
): Promise<UsageOverview> {
  const now = options.now ?? Date.now();
  const config = options.config ?? getUsageConfiguration();
  const configuration =
    !config.accountId || (!config.analyticsToken && !config.billingToken)
      ? "missing"
      : config.analyticsToken && config.billingToken
        ? "configured"
        : "partial";
  const result: UsageOverview = {
    account: config.accountId ? { id: config.accountId, name: null } : null,
    configuration,
    metrics: [],
    costs: [],
    history: [],
    coverage: [],
    sync: {
      state: "idle",
      jobId: null,
      lastSuccessTimeUtc: null,
      nextRunTimeUtc: null,
      retryTimeUtc: null,
    },
    collectedTimeUtc: null,
  };
  if (!config.accountId) {
    result.coverage.push({
      product: "Cloudflare",
      status: "not_configured",
      reason: "CF_USAGE_ACCOUNT_ID_missing_or_invalid",
    });
    return result;
  }
  for (const [product, configured] of [
    ["Analytics", config.analyticsToken],
    ["Billing", config.billingToken],
  ] as const)
    if (!configured)
      result.coverage.push({
        product,
        status: "not_configured",
        reason: "dedicated_token_missing",
      });
  const stored = await (options.repository ?? getUsageRepository()).read(
    config.accountId,
    Math.floor(now / DAY_MS) * DAY_MS - ((params.days ?? 7) - 1) * DAY_MS
  );
  result.sync = stored.sync;
  result.history = stored.history;
  result.coverage.push(...stored.coverage);
  for (const snapshot of stored.snapshots) {
    if (result.account) result.account.name ??= snapshot.accountName;
    const stale =
      snapshot.collectedTimeUtc < now - 2 * INTERVAL_MS ||
      stored.coverage.some(
        (c) =>
          c.product === snapshot.source &&
          [
            "unavailable",
            "not_configured",
            "permission_or_capability_denied",
            "retrying",
          ].includes(c.status)
      );
    result.metrics.push(
      ...snapshot.metrics.map((metric) =>
        stale
          ? {
              ...metric,
              status: "stale",
              reason: `${metric.reason ? `${metric.reason};` : ""}snapshot_stale`,
            }
          : metric
      )
    );
    result.costs.push(
      ...snapshot.costs.map((cost) =>
        stale ? { ...cost, status: "stale_official_usage_cost" } : cost
      )
    );
    if (stale)
      result.coverage.push({
        product: snapshot.source,
        status: "stale",
        reason: "last_successful_source_snapshot_retained",
      });
    result.collectedTimeUtc = Math.max(
      result.collectedTimeUtc ?? 0,
      snapshot.collectedTimeUtc
    );
  }
  return result;
}
export async function requestUsageRefresh(
  _params: object = {},
  options: {
    now?: number;
    config?: UsageConfiguration;
    repository?: UsageRepository;
  } = {}
): Promise<UsageRefresh> {
  const config = options.config ?? getUsageConfiguration();
  if (!config.accountId || (!config.analyticsToken && !config.billingToken))
    return {
      accepted: false,
      jobId: null,
      eligibleTimeUtc: null,
      state: "idle",
    };
  return (options.repository ?? getUsageRepository()).request(
    config.accountId,
    options.now ?? Date.now(),
    crypto.randomUUID(),
    true
  );
}
export default {
  overview: {
    req: UsageOverviewRequestSchema,
    res: UsageOverviewResponseSchema,
    pathInfo: {
      path: "/overview",
      method: "post",
      summary: "Read Cloudflare account usage",
    },
    adapter: bodyAdapter,
    service: readUsageOverview,
    permission: { action: "read" },
  } satisfies API,
  refresh: {
    req: UsageRefreshRequestSchema,
    res: UsageRefreshResponseSchema,
    pathInfo: {
      path: "/refresh",
      method: "post",
      summary: "Request Cloudflare usage refresh",
    },
    adapter: bodyAdapter,
    service: requestUsageRefresh,
    permission: { action: "update" },
  } satisfies API,
};
