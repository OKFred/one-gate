CREATE TABLE IF NOT EXISTS `admin_mobile_device_app` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`app_id` integer NOT NULL,
	`installed_version_code` integer NOT NULL,
	`installed_version_name` text NOT NULL,
	`install_status` text NOT NULL,
	`last_sync_time_utc` integer NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `admin_mobile_device_app_unique` ON `admin_mobile_device_app` (`client_id`,`app_id`);
