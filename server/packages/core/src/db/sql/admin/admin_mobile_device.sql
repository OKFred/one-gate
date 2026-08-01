CREATE TABLE IF NOT EXISTS `admin_mobile_device` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`device_name` text,
	`is_enabled` integer NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `admin_mobile_device_client_id_unique` ON `admin_mobile_device` (`client_id`);
