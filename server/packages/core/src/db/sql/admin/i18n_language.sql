CREATE TABLE IF NOT EXISTS `i18n_language` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lang_code` text(10) NOT NULL,
	`native_name` text(50) NOT NULL,
	`is_enabled` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_language_code` ON `i18n_language` (`lang_code`);
