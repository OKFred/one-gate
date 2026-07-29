CREATE TABLE IF NOT EXISTS `base_user_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`namespace` text NOT NULL,
	`config_key` text NOT NULL,
	`is_enabled` integer NOT NULL,
	`is_primary` integer NOT NULL,
	`config_value` text NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE INDEX IF NOT EXISTS `idx_base_user_config_tenant_namespace` ON `base_user_config` (`user_id`,`namespace`);
