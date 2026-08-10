CREATE TABLE IF NOT EXISTS `admin_mobile_device_event` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`client_id` text NOT NULL,
	`event_type` text NOT NULL,
	`event_time_utc` integer NOT NULL,
	`summary_json` text,
	`payload_ciphertext` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `admin_mobile_device_event_client_event_unique` ON `admin_mobile_device_event` (`client_id`,`event_id`);

CREATE INDEX IF NOT EXISTS `admin_mobile_device_event_client_time_idx` ON `admin_mobile_device_event` (`client_id`,`event_time_utc`);

CREATE INDEX IF NOT EXISTS `admin_mobile_device_event_type_idx` ON `admin_mobile_device_event` (`event_type`);
