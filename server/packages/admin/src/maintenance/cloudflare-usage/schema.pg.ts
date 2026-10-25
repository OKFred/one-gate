import { pgTable, text, primaryKey, index } from "drizzle-orm/pg-core";
import { pgInteger, pgIntegerBounds } from "@hodor/core/db/postgresql/columns";
export const cloudflareUsageSnapshotTable = pgTable(
  "cloudflare_usage_snapshot",
  {
    accountId: text("account_id").notNull(),
    source: text("source").notNull(),
    payloadJson: text("payload_json").notNull(),
    collectedTimeUtc: pgInteger("collected_time_utc").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.source] }),
    ...pgIntegerBounds("cloudflare_usage_snapshot", t),
  ]
);
export const cloudflareUsageDailyTable = pgTable(
  "cloudflare_usage_daily",
  {
    accountId: text("account_id").notNull(),
    metricId: text("metric_id").notNull(),
    dayUtc: pgInteger("day_utc").notNull(),
    kind: text("kind").notNull(),
    source: text("source").notNull(),
    value: text("value"),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.metricId, t.dayUtc, t.kind] }),
    index("cloudflare_usage_daily_retention_idx").on(t.accountId, t.dayUtc),
    ...pgIntegerBounds("cloudflare_usage_daily", t),
  ]
);
export const cloudflareUsageSyncTable = pgTable(
  "cloudflare_usage_sync",
  {
    accountId: text("account_id").primaryKey(),
    jobId: text("job_id"),
    state: text("state").notNull(),
    lastSuccessTimeUtc: pgInteger("last_success_time_utc"),
    nextRunTimeUtc: pgInteger("next_run_time_utc").notNull(),
    retryTimeUtc: pgInteger("retry_time_utc"),
    requestedTimeUtc: pgInteger("requested_time_utc").notNull(),
    owner: text("owner"),
    generation: pgInteger("generation").notNull(),
    leaseExpiresTimeUtc: pgInteger("lease_expires_time_utc").notNull(),
    cursorJson: text("cursor_json"),
    attempts: pgInteger("attempts").notNull(),
    coverageJson: text("coverage_json").notNull(),
  },
  (t) => [...pgIntegerBounds("cloudflare_usage_sync", t)]
);
