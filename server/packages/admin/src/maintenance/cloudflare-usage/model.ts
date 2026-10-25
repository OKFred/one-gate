import {
  integer,
  text,
  sqliteTable,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

const nullableNumber = { type: ["number", "null"] } as const;
const nullableString = { type: ["string", "null"] } as const;
export const UsageMetricSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    product: { type: "string" },
    name: { type: "string" },
    unit: { type: "string" },
    used: nullableNumber,
    limit: nullableNumber,
    remaining: nullableNumber,
    percentage: nullableNumber,
    periodKind: { enum: ["day", "billing_cycle", "calendar_month", "instant"] },
    periodStartUtc: nullableNumber,
    periodEndUtc: nullableNumber,
    resetTimeUtc: nullableNumber,
    quotaKind: { enum: ["included", "hard", "capacity", "unknown"] },
    source: { type: "string" },
    quality: { enum: ["exact", "estimated", "reference", "unknown"] },
    status: { type: "string" },
    reason: nullableString,
    collectedTimeUtc: { type: "number" },
  },
  required: [
    "id",
    "product",
    "name",
    "unit",
    "used",
    "limit",
    "remaining",
    "percentage",
    "periodKind",
    "periodStartUtc",
    "periodEndUtc",
    "resetTimeUtc",
    "quotaKind",
    "source",
    "quality",
    "status",
    "reason",
    "collectedTimeUtc",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const UsageCostSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    product: { type: "string" },
    currency: { type: "string" },
    amount: { type: "string" },
    periodStartUtc: nullableNumber,
    periodEndUtc: nullableNumber,
    source: { type: "string" },
    status: { type: "string" },
  },
  required: [
    "id",
    "product",
    "currency",
    "amount",
    "periodStartUtc",
    "periodEndUtc",
    "source",
    "status",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const UsageHistorySchema = {
  type: "object",
  properties: {
    metricId: { type: "string" },
    dayUtc: { type: "number" },
    value: nullableNumber,
    kind: { enum: ["daily_usage", "cumulative_snapshot"] },
    source: { type: "string" },
  },
  required: ["metricId", "dayUtc", "value", "kind", "source"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const UsageCoverageSchema = {
  type: "object",
  properties: {
    product: { type: "string" },
    status: { type: "string" },
    reason: nullableString,
  },
  required: ["product", "status", "reason"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const syncStates = [
  "idle",
  "pending",
  "running",
  "partial",
  "failed",
  "complete",
] as const;
export const UsageSyncSchema = {
  type: "object",
  properties: {
    state: { enum: syncStates },
    jobId: nullableString,
    lastSuccessTimeUtc: nullableNumber,
    nextRunTimeUtc: nullableNumber,
    retryTimeUtc: nullableNumber,
  },
  required: [
    "state",
    "jobId",
    "lastSuccessTimeUtc",
    "nextRunTimeUtc",
    "retryTimeUtc",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const UsageOverviewRequestSchema = {
  type: "object",
  properties: { days: { enum: [7, 30] } },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const UsageOverviewResponseSchema = {
  type: "object",
  properties: {
    account: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          properties: { id: { type: "string" }, name: nullableString },
          required: ["id", "name"],
          additionalProperties: false,
        },
      ],
    },
    configuration: { enum: ["missing", "partial", "configured"] },
    metrics: { type: "array", items: UsageMetricSchema },
    costs: { type: "array", items: UsageCostSchema },
    history: { type: "array", items: UsageHistorySchema },
    coverage: { type: "array", items: UsageCoverageSchema },
    sync: UsageSyncSchema,
    collectedTimeUtc: nullableNumber,
  },
  required: [
    "account",
    "configuration",
    "metrics",
    "costs",
    "history",
    "coverage",
    "sync",
    "collectedTimeUtc",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const UsageRefreshRequestSchema = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const UsageRefreshResponseSchema = {
  type: "object",
  properties: {
    accepted: { type: "boolean" },
    jobId: nullableString,
    eligibleTimeUtc: nullableNumber,
    state: { enum: syncStates },
  },
  required: ["accepted", "jobId", "eligibleTimeUtc", "state"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export type UsageMetric = FromSchema<typeof UsageMetricSchema>;
export type UsageCost = FromSchema<typeof UsageCostSchema>;
export type UsageHistory = FromSchema<typeof UsageHistorySchema>;
export type UsageCoverage = FromSchema<typeof UsageCoverageSchema>;
export type UsageSync = FromSchema<typeof UsageSyncSchema>;
export type UsageOverview = FromSchema<typeof UsageOverviewResponseSchema>;
export type UsageRefresh = FromSchema<typeof UsageRefreshResponseSchema>;

// Only sanitized, normalized aggregate metadata is persisted in these JSON columns.
export const cloudflareUsageSnapshotTable = sqliteTable(
  "cloudflare_usage_snapshot",
  {
    accountId: text("account_id").notNull(),
    source: text("source").notNull(),
    payloadJson: text("payload_json").notNull(),
    collectedTimeUtc: integer("collected_time_utc").notNull(),
  },
  (t) => [primaryKey({ columns: [t.accountId, t.source] })]
);
export const cloudflareUsageDailyTable = sqliteTable(
  "cloudflare_usage_daily",
  {
    accountId: text("account_id").notNull(),
    metricId: text("metric_id").notNull(),
    dayUtc: integer("day_utc").notNull(),
    kind: text("kind").notNull(),
    source: text("source").notNull(),
    value: text("value"),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.metricId, t.dayUtc, t.kind] }),
    index("cloudflare_usage_daily_retention_idx").on(t.accountId, t.dayUtc),
  ]
);
export const cloudflareUsageSyncTable = sqliteTable("cloudflare_usage_sync", {
  accountId: text("account_id").primaryKey(),
  jobId: text("job_id"),
  state: text("state").notNull(),
  lastSuccessTimeUtc: integer("last_success_time_utc"),
  nextRunTimeUtc: integer("next_run_time_utc").notNull(),
  retryTimeUtc: integer("retry_time_utc"),
  requestedTimeUtc: integer("requested_time_utc").notNull(),
  owner: text("owner"),
  generation: integer("generation").notNull(),
  leaseExpiresTimeUtc: integer("lease_expires_time_utc").notNull(),
  cursorJson: text("cursor_json"),
  attempts: integer("attempts").notNull(),
  coverageJson: text("coverage_json").notNull(),
});
