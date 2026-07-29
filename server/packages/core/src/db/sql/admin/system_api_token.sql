CREATE TABLE IF NOT EXISTS `system_api_token` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`token_prefix` text NOT NULL,
	`token_hash` text NOT NULL,
	`permissions` text NOT NULL,
	`ip_whitelist` text,
	`start_time_utc` integer,
	`expire_time_utc` integer,
	`last_used_time_utc` integer,
	`status` text NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `system_api_token_token_hash_unique` ON `system_api_token` (`token_hash`);
