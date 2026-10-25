CREATE TABLE IF NOT EXISTS `cloudflare_usage_daily` (
	`account_id` text NOT NULL,
	`metric_id` text NOT NULL,
	`day_utc` integer NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`value` text,
	PRIMARY KEY(`account_id`, `metric_id`, `day_utc`, `kind`)
);

CREATE INDEX IF NOT EXISTS `cloudflare_usage_daily_retention_idx` ON `cloudflare_usage_daily` (`account_id`,`day_utc`);
