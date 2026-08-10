ALTER TABLE `admin_mobile_device` ADD COLUMN `reported_status` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `last_heartbeat_time_utc` integer;
ALTER TABLE `admin_mobile_device` ADD COLUMN `last_online_time_utc` integer;
ALTER TABLE `admin_mobile_device` ADD COLUMN `last_offline_time_utc` integer;
ALTER TABLE `admin_mobile_device` ADD COLUMN `manufacturer` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `brand` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `model` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `android_version` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `android_sdk` integer;
ALTER TABLE `admin_mobile_device` ADD COLUMN `autojs6_version` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `client_version` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `protocol_version` integer;
ALTER TABLE `admin_mobile_device` ADD COLUMN `battery_level` integer;
ALTER TABLE `admin_mobile_device` ADD COLUMN `is_charging` integer;
ALTER TABLE `admin_mobile_device` ADD COLUMN `network_connected` integer;
ALTER TABLE `admin_mobile_device` ADD COLUMN `network_type` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `imei_status` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `imei_masked_json` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `imei_ciphertext` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `serial_status` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `serial_masked` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `serial_ciphertext` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `capabilities_json` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `reported_extra_json` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `custom_metadata_json` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `custom_sensitive_metadata_ciphertext` text;
ALTER TABLE `admin_mobile_device` ADD COLUMN `report_token_hash` text;

CREATE INDEX IF NOT EXISTS `admin_mobile_device_last_heartbeat_idx` ON `admin_mobile_device` (`last_heartbeat_time_utc`);
CREATE INDEX IF NOT EXISTS `admin_mobile_device_status_idx` ON `admin_mobile_device` (`reported_status`);

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
