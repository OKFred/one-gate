CREATE TABLE `base_biz_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer,
	`namespace` text NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`status` integer,
	`payload_type` text NOT NULL,
	`log_value` text NOT NULL
);

CREATE INDEX `idx_biz_log_namespace` ON `base_biz_log` (`namespace`);

CREATE INDEX `idx_biz_log_tenant` ON `base_biz_log` (`tenant_id`);

CREATE INDEX `idx_biz_log_time` ON `base_biz_log` (`create_time_utc`);
