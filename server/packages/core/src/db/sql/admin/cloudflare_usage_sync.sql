CREATE TABLE IF NOT EXISTS `cloudflare_usage_sync` (
	`account_id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`state` text NOT NULL,
	`last_success_time_utc` integer,
	`next_run_time_utc` integer NOT NULL,
	`retry_time_utc` integer,
	`requested_time_utc` integer NOT NULL,
	`owner` text,
	`generation` integer NOT NULL,
	`lease_expires_time_utc` integer NOT NULL,
	`cursor_json` text,
	`attempts` integer NOT NULL,
	`coverage_json` text NOT NULL
);
