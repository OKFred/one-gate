CREATE TABLE IF NOT EXISTS `admin_mobile_device` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`device_name` text,
	`is_enabled` integer NOT NULL,
	`remark` text,
	`reported_status` text,
	`last_heartbeat_time_utc` integer,
	`last_online_time_utc` integer,
	`last_offline_time_utc` integer,
	`manufacturer` text,
	`brand` text,
	`model` text,
	`android_version` text,
	`android_sdk` integer,
	`autojs6_version` text,
	`client_version` text,
	`protocol_version` integer,
	`battery_level` integer,
	`is_charging` integer,
	`network_connected` integer,
	`network_type` text,
	`imei_status` text,
	`imei_masked_json` text,
	`imei_ciphertext` text,
	`serial_status` text,
	`serial_masked` text,
	`serial_ciphertext` text,
	`capabilities_json` text,
	`reported_extra_json` text,
	`custom_metadata_json` text,
	`custom_sensitive_metadata_ciphertext` text,
	`report_token_hash` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `admin_mobile_device_client_id_unique` ON `admin_mobile_device` (`client_id`);

CREATE INDEX IF NOT EXISTS `admin_mobile_device_last_heartbeat_idx` ON `admin_mobile_device` (`last_heartbeat_time_utc`);

CREATE INDEX IF NOT EXISTS `admin_mobile_device_status_idx` ON `admin_mobile_device` (`reported_status`);
