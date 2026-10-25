CREATE TABLE "cloudflare_usage_daily" (
	"account_id" text NOT NULL,
	"metric_id" text NOT NULL,
	"day_utc" bigint NOT NULL,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"value" text,
	CONSTRAINT "cloudflare_usage_daily_account_id_metric_id_day_utc_kind_pk" PRIMARY KEY("account_id","metric_id","day_utc","kind"),
	CONSTRAINT "cloudflare_usage_daily_safe_day_utc" CHECK ("cloudflare_usage_daily"."day_utc" BETWEEN -9007199254740991 AND 9007199254740991)
);

CREATE TABLE "cloudflare_usage_snapshot" (
	"account_id" text NOT NULL,
	"source" text NOT NULL,
	"payload_json" text NOT NULL,
	"collected_time_utc" bigint NOT NULL,
	CONSTRAINT "cloudflare_usage_snapshot_account_id_source_pk" PRIMARY KEY("account_id","source"),
	CONSTRAINT "cloudflare_usage_snapshot_safe_collected_time_utc" CHECK ("cloudflare_usage_snapshot"."collected_time_utc" BETWEEN -9007199254740991 AND 9007199254740991)
);

CREATE TABLE "cloudflare_usage_sync" (
	"account_id" text PRIMARY KEY NOT NULL,
	"job_id" text,
	"state" text NOT NULL,
	"last_success_time_utc" bigint,
	"next_run_time_utc" bigint NOT NULL,
	"retry_time_utc" bigint,
	"requested_time_utc" bigint NOT NULL,
	"owner" text,
	"generation" bigint NOT NULL,
	"lease_expires_time_utc" bigint NOT NULL,
	"cursor_json" text,
	"attempts" bigint NOT NULL,
	"coverage_json" text NOT NULL,
	CONSTRAINT "cloudflare_usage_sync_safe_last_success_time_utc" CHECK ("cloudflare_usage_sync"."last_success_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "cloudflare_usage_sync_safe_next_run_time_utc" CHECK ("cloudflare_usage_sync"."next_run_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "cloudflare_usage_sync_safe_retry_time_utc" CHECK ("cloudflare_usage_sync"."retry_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "cloudflare_usage_sync_safe_requested_time_utc" CHECK ("cloudflare_usage_sync"."requested_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "cloudflare_usage_sync_safe_generation" CHECK ("cloudflare_usage_sync"."generation" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "cloudflare_usage_sync_safe_lease_expires_time_utc" CHECK ("cloudflare_usage_sync"."lease_expires_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "cloudflare_usage_sync_safe_attempts" CHECK ("cloudflare_usage_sync"."attempts" BETWEEN -9007199254740991 AND 9007199254740991)
);

CREATE INDEX "cloudflare_usage_daily_retention_idx" ON "cloudflare_usage_daily" USING btree ("account_id","day_utc");
