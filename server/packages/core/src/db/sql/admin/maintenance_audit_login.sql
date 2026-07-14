CREATE TABLE `maintenance_audit_login` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`login_time_utc` integer NOT NULL,
	`ip` text(50),
	`user_agent` text(500),
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE INDEX `idx_login_audit_user_id` ON `maintenance_audit_login` (`user_id`);

CREATE INDEX `idx_login_audit_time` ON `maintenance_audit_login` (`login_time_utc`);
