CREATE TABLE IF NOT EXISTS `base_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer,
	`namespace` text NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`action` text NOT NULL,
	`target_id` text,
	`payload_type` text NOT NULL,
	`before_data` text,
	`after_data` text
);

CREATE INDEX IF NOT EXISTS `idx_audit_log_namespace` ON `base_audit_log` (`namespace`);

CREATE INDEX IF NOT EXISTS `idx_audit_log_tenant` ON `base_audit_log` (`tenant_id`);

CREATE INDEX IF NOT EXISTS `idx_audit_log_time` ON `base_audit_log` (`create_time_utc`);
