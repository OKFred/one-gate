CREATE TABLE IF NOT EXISTS `admin_mobile_app_version` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`version_name` text NOT NULL,
	`version_code` integer NOT NULL,
	`apk_url` text NOT NULL,
	`release_notes` text,
	`is_forced` integer NOT NULL,
	`is_enabled` integer NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `admin_mobile_app_version_app_id_version_code_unique` ON `admin_mobile_app_version` (`app_id`,`version_code`);
