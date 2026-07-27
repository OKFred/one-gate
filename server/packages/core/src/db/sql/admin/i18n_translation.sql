CREATE TABLE IF NOT EXISTS `i18n_translation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application` text(100) NOT NULL,
	`business` text(100) NOT NULL,
	`lang_code` text(10) NOT NULL,
	`t_key` text NOT NULL,
	`t_value` text NOT NULL,
	`value_hash` text(64) NOT NULL,
	`remark` text,
	`is_enabled` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE INDEX IF NOT EXISTS `idx_value_hash` ON `i18n_translation` (`value_hash`);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_unique_tkey_langcode` ON `i18n_translation` (`t_key`,`lang_code`);
