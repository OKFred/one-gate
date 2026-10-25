CREATE TABLE IF NOT EXISTS `cloudflare_usage_snapshot` (
	`account_id` text NOT NULL,
	`source` text NOT NULL,
	`payload_json` text NOT NULL,
	`collected_time_utc` integer NOT NULL,
	PRIMARY KEY(`account_id`, `source`)
);
