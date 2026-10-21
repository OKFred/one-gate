CREATE TABLE IF NOT EXISTS `enterprise_asset_identifier` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	`identifier_type` text NOT NULL,
	`namespace` text NOT NULL,
	`value` text NOT NULL,
	`normalized_value` text NOT NULL,
	`source` text NOT NULL,
	`confidence` text NOT NULL,
	`is_verified` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer,
	FOREIGN KEY (`tenant_id`,`asset_id`) REFERENCES `enterprise_asset`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enterprise_asset_identifier_type_check" CHECK("enterprise_asset_identifier"."identifier_type" IN ('sn','wwn','gpu_uuid','sid','other')),
	CONSTRAINT "enterprise_asset_identifier_confidence_check" CHECK("enterprise_asset_identifier"."confidence" IN ('high','medium','low')),
	CONSTRAINT "enterprise_asset_identifier_verified_check" CHECK("enterprise_asset_identifier"."is_verified" IN (0,1))
);

CREATE UNIQUE INDEX IF NOT EXISTS `enterprise_asset_identifier_verified_unique` ON `enterprise_asset_identifier` (`tenant_id`,`identifier_type`,`namespace`,`normalized_value`) WHERE "enterprise_asset_identifier"."is_verified" = 1;

CREATE INDEX IF NOT EXISTS `enterprise_asset_identifier_asset_idx` ON `enterprise_asset_identifier` (`tenant_id`,`asset_id`);
