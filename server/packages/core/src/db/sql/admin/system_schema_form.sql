CREATE TABLE IF NOT EXISTS `system_schema_form` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`schema_data` text NOT NULL,
	`ui_schema_data` text,
	`remark` text,
	`is_enabled` integer NOT NULL,
	`source` text NOT NULL,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`updater_id` integer,
	`updater_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `system_schema_form_code_unique` ON `system_schema_form` (`code`);
