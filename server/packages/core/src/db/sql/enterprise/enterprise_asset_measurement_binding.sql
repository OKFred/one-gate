CREATE TABLE IF NOT EXISTS `enterprise_asset_measurement_binding` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	`source_system` text NOT NULL,
	`collector_id` text NOT NULL,
	`device_id` text NOT NULL,
	`metric` text NOT NULL,
	`channel` text NOT NULL,
	`valid_from_utc` integer NOT NULL,
	`valid_to_utc` integer,
	`reason` text NOT NULL,
	`close_reason` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer,
	FOREIGN KEY (`tenant_id`,`asset_id`) REFERENCES `enterprise_asset`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enterprise_asset_binding_interval_check" CHECK("enterprise_asset_measurement_binding"."valid_from_utc" >= 0 AND ("enterprise_asset_measurement_binding"."valid_to_utc" IS NULL OR "enterprise_asset_measurement_binding"."valid_to_utc" > "enterprise_asset_measurement_binding"."valid_from_utc"))
);

CREATE INDEX IF NOT EXISTS `enterprise_asset_binding_asset_idx` ON `enterprise_asset_measurement_binding` (`tenant_id`,`asset_id`,`valid_from_utc`);

CREATE INDEX IF NOT EXISTS `enterprise_asset_binding_source_idx` ON `enterprise_asset_measurement_binding` (`tenant_id`,`source_system`,`collector_id`,`device_id`,`metric`,`channel`,`valid_from_utc`);
