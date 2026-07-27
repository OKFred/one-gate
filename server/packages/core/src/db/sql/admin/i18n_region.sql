CREATE TABLE IF NOT EXISTS `i18n_region` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`labels` text,
	`alpha2_code` text(2) NOT NULL,
	`alpha3_code` text(3) NOT NULL,
	`numeric` integer NOT NULL,
	`iso_3166_independent` integer NOT NULL,
	`business_languages` text,
	`is_enabled` integer NOT NULL,
	`remark` text(500),
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_region_numeric` ON `i18n_region` (`numeric`);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_region_alpha2` ON `i18n_region` (`alpha2_code`);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_region_alpha3` ON `i18n_region` (`alpha3_code`);
