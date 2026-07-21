CREATE TABLE `base_biz_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`namespace` text NOT NULL,
	`config_key` text NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`config_value` text NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE INDEX `idx_base_biz_config_tenant_namespace` ON `base_biz_config` (`tenant_id`,`namespace`);
