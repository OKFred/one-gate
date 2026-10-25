import { CloudflareUsageClient, UsageSourceError } from "./client";
import {
  DAY_MS,
  numberOrNull,
  record,
  type SourceSnapshot,
  type UsageCursor,
} from "./types";
import { applyQuota } from "./rules";
import { time } from "./normalize";
export interface AnalyticsAdapter {
  product: string;
  dataset: string;
  fields: readonly { field: string; name: string; unit: string }[];
  action?: boolean;
  source: string;
}
export const ANALYTICS_ADAPTERS: readonly AnalyticsAdapter[] = [
  {
    product: "Workers",
    dataset: "workersInvocationsAdaptive",
    fields: [
      {
        field: "requests",
        name: "Workers requests (analytics)",
        unit: "requests",
      },
    ],
    source:
      "https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/",
  },
  {
    product: "Pages Functions",
    dataset: "pagesFunctionsInvocationsAdaptiveGroups",
    fields: [
      {
        field: "requests",
        name: "Pages Functions requests (analytics)",
        unit: "requests",
      },
    ],
    source:
      "https://developers.cloudflare.com/data-localization/metadata-boundary/graphql-datasets/",
  },
  {
    product: "D1",
    dataset: "d1AnalyticsAdaptiveGroups",
    fields: [
      { field: "rowsRead", name: "D1 rows read", unit: "rows" },
      { field: "rowsWritten", name: "D1 rows written", unit: "rows" },
    ],
    source:
      "https://developers.cloudflare.com/d1/observability/metrics-analytics/",
  },
  {
    product: "KV",
    dataset: "kvOperationsAdaptiveGroups",
    fields: [{ field: "requests", name: "KV operations", unit: "operations" }],
    action: true,
    source:
      "https://developers.cloudflare.com/kv/observability/metrics-analytics/",
  },
  {
    product: "R2",
    dataset: "r2OperationsAdaptiveGroups",
    fields: [
      {
        field: "requests",
        name: "R2 API operations (analytics)",
        unit: "requests",
      },
    ],
    action: true,
    source: "https://developers.cloudflare.com/r2/platform/metrics-analytics/",
  },
  {
    product: "Queues",
    dataset: "queueMessageOperationsAdaptiveGroups",
    fields: [
      {
        field: "billableOperations",
        name: "Queues billable operations",
        unit: "operations",
      },
    ],
    source: "https://developers.cloudflare.com/queues/observability/metrics/",
  },
  {
    product: "Durable Objects",
    dataset: "durableObjectsInvocationsAdaptiveGroups",
    fields: [
      { field: "requests", name: "Durable Objects requests", unit: "requests" },
    ],
    source:
      "https://developers.cloudflare.com/durable-objects/observability/metrics-and-analytics/",
  },
];
export function accountResult(
  data: Record<string, unknown>
): Record<string, unknown> {
  if (
    !record(data.viewer) ||
    !Array.isArray(data.viewer.accounts) ||
    data.viewer.accounts.length !== 1 ||
    !record(data.viewer.accounts[0])
  )
    throw new UsageSourceError("account_scope_unavailable");
  return data.viewer.accounts[0];
}
export async function discoverAnalytics(
  client: CloudflareUsageClient,
  now: number
): Promise<string[]> {
  const scoped = accountResult(
    await client.graphql(
      "query UsageAccountType($account: string!) { viewer { accounts(filter: {accountTag: $account}) { __typename } } }",
      { account: client.config.accountId },
      now
    )
  );
  const typeName = scoped.__typename;
  if (
    typeof typeName !== "string" ||
    !/^[_A-Za-z][_0-9A-Za-z]{0,200}$/.test(typeName)
  )
    throw new UsageSourceError("schema_unavailable");
  const data = await client.graphql(
    `{ __type(name: ${JSON.stringify(typeName)}) { fields { name } } }`,
    {},
    now
  );
  if (!record(data.__type) || !Array.isArray(data.__type.fields))
    throw new UsageSourceError("schema_unavailable");
  return data.__type.fields.flatMap((f) =>
    record(f) && typeof f.name === "string" ? [f.name] : []
  );
}
export async function advanceAnalytics(
  client: CloudflareUsageClient,
  adapter: AnalyticsAdapter,
  cursor: UsageCursor,
  now: number
): Promise<SourceSnapshot | null> {
  const metadata = cursor.metadata;
  if (!metadata || !metadata.datasetNames.includes(adapter.dataset))
    throw new UsageSourceError("dataset_unavailable");
  if (!metadata.analytics) {
    const settingsData = accountResult(
      await client.graphql(
        `query UsageSettings($account: string!) { viewer { accounts(filter: {accountTag: $account}) { settings { ${adapter.dataset} { enabled maxPageSize maxDuration notOlderThan availableFields } } } } }`,
        { account: client.config.accountId },
        now
      )
    );
    const settings = record(settingsData.settings)
      ? settingsData.settings[adapter.dataset]
      : null;
    if (!record(settings) || settings.enabled !== true)
      throw new UsageSourceError("dataset_disabled");
    const fields = Array.isArray(settings.availableFields)
      ? settings.availableFields.filter(
          (f): f is string => typeof f === "string"
        )
      : [];
    if (
      !fields.includes("dimensions_date") ||
      (adapter.action && !fields.includes("dimensions_actionType"))
    )
      throw new UsageSourceError("daily_dimension_unavailable");
    const supported = adapter.fields.filter((f) =>
      fields.includes(`sum_${f.field}`)
    );
    if (!supported.length)
      throw new UsageSourceError("meter_fields_unavailable");
    const maxDuration = numberOrNull(settings.maxDuration);
    const retention = numberOrNull(settings.notOlderThan);
    const pageSize = numberOrNull(settings.maxPageSize);
    if (
      maxDuration === null ||
      maxDuration < 86400 ||
      retention === null ||
      retention < 86400 ||
      pageSize === null ||
      pageSize < 2
    )
      throw new UsageSourceError("window_capability_unavailable");
    const intended =
      Math.floor(cursor.startedTimeUtc / DAY_MS) * DAY_MS - 29 * DAY_MS;
    const retained = Math.max(
      intended,
      Math.ceil((cursor.startedTimeUtc - retention * 1000) / DAY_MS) * DAY_MS
    );
    metadata.analytics = {
      nextStartUtc: retained,
      retainedStartUtc: retained,
      maxDurationMs: Math.floor(maxDuration / 86400) * DAY_MS,
      pageLimit: Math.min(1000, Math.floor(pageSize)),
      fields: supported.map((f) => f.field),
      history: [],
    };
  }
  const state = metadata.analytics;
  const targetEnd = cursor.startedTimeUtc;
  const end = Math.min(targetEnd, state.nextStartUtc + state.maxDurationMs);
  if (end <= state.nextStartUtc)
    throw new UsageSourceError("incomplete_window");
  const selected = adapter.fields.filter((f) => state.fields.includes(f.field));
  const result = accountResult(
    await client.graphql(
      `query UsageWindow($account: string!, $start: Time!, $end: Time!) { viewer { accounts(filter: {accountTag: $account}) { ${adapter.dataset}(limit: ${state.pageLimit}, filter: {datetime_geq: $start, datetime_lt: $end}, orderBy: [date_ASC]) { sum { ${selected.map((f) => f.field).join(" ")} } dimensions { date ${adapter.action ? "actionType" : ""} } } } } }`,
      {
        account: client.config.accountId,
        start: new Date(state.nextStartUtc).toISOString(),
        end: new Date(end).toISOString(),
      },
      now
    )
  );
  const rows = result[adapter.dataset];
  if (!Array.isArray(rows)) throw new UsageSourceError("incomplete_response");
  if (rows.length >= state.pageLimit)
    throw new UsageSourceError("truncated_window");
  for (const row of rows) {
    if (!record(row) || !record(row.dimensions) || !record(row.sum))
      throw new UsageSourceError("invalid_response");
    const day = time(row.dimensions.date);
    if (
      day === null ||
      day < Math.floor(state.nextStartUtc / DAY_MS) * DAY_MS ||
      day >= end
    )
      throw new UsageSourceError("invalid_window");
    const action =
      adapter.action && typeof row.dimensions.actionType === "string"
        ? row.dimensions.actionType.slice(0, 64)
        : null;
    for (const f of selected) {
      const value = numberOrNull(row.sum[f.field]);
      const id = `analytics:${adapter.dataset}:${f.field}${action ? `:${encodeURIComponent(action)}` : ""}`;
      const previous = state.history.find(
        (h) => h.metricId === id && h.dayUtc === day
      );
      if (previous)
        previous.value =
          previous.value === null || value === null
            ? null
            : previous.value + value;
      else
        state.history.push({
          metricId: id,
          dayUtc: day,
          value,
          kind: "daily_usage",
          source: `graphql:${adapter.dataset}`,
        });
    }
  }
  state.nextStartUtc = end;
  if (end < targetEnd) return null;
  const today = Math.floor(targetEnd / DAY_MS) * DAY_MS;
  const history = state.history;
  const snapshot: SourceSnapshot = {
    source: `analytics:${adapter.dataset}`,
    accountName: null,
    collectedTimeUtc: now,
    history,
    costs: [],
    coverage: [
      {
        product: adapter.product,
        status: history.length ? "available" : "empty",
        reason: history.length
          ? `adaptive_sampling;provider_latency;${adapter.source}`
          : "no_rows;not_zero_usage",
      },
    ],
    metrics: history
      .filter((h) => h.dayUtc === today)
      .map((h) => {
        const f = selected.find((field) =>
          h.metricId.startsWith(`analytics:${adapter.dataset}:${field.field}`)
        );
        const action = adapter.action
          ? decodeURIComponent(h.metricId.split(":").at(-1) ?? "")
          : null;
        const name =
          adapter.product === "KV" && action
            ? `KV ${action}`
            : `${f?.name ?? "Unknown metric"}${action ? ` (${action})` : ""}`;
        return applyQuota(
          {
            id: h.metricId,
            product: adapter.product,
            name,
            unit: f?.unit ?? "unknown",
            used: h.value,
            limit: null,
            remaining: null,
            percentage: null,
            periodKind: "day",
            periodStartUtc: today,
            periodEndUtc: today + DAY_MS,
            resetTimeUtc: today + DAY_MS,
            quotaKind: "unknown",
            source: h.source,
            quality: "estimated",
            status: "available",
            reason: `adaptive_sampling;provider_latency;day_in_progress;${adapter.product === "Workers" || adapter.product === "Pages Functions" ? "shared_pool_not_duplicated;" : ""}${adapter.source}`,
            collectedTimeUtc: now,
          },
          metadata.plan
        );
      }),
  };
  if (state.retainedStartUtc > today - 29 * DAY_MS)
    snapshot.coverage.push({
      product: adapter.product,
      status: "partial",
      reason: "history_retention_limited;no_zero_fill",
    });
  delete metadata.analytics;
  return snapshot;
}
