CREATE TABLE IF NOT EXISTS `enterprise_asset` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`asset_id` text NOT NULL,
	`asset_code` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`brand` text,
	`model` text,
	`remark` text,
	`status` text NOT NULL,
	`retired_time_utc` integer,
	`state_reason` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer,
	FOREIGN KEY (`tenant_id`) REFERENCES `enterprise_tenant`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enterprise_asset_state_check" CHECK(("enterprise_asset"."status" = 'active' AND "enterprise_asset"."retired_time_utc" IS NULL) OR ("enterprise_asset"."status" = 'retired' AND "enterprise_asset"."retired_time_utc" IS NOT NULL)),
	CONSTRAINT "enterprise_asset_category_check" CHECK("enterprise_asset"."category" IN ('host','disk','gpu','board','sensor','meter','other'))
);

CREATE UNIQUE INDEX IF NOT EXISTS `enterprise_asset_public_id_unique` ON `enterprise_asset` (`asset_id`);

CREATE UNIQUE INDEX IF NOT EXISTS `enterprise_asset_tenant_id_unique` ON `enterprise_asset` (`tenant_id`,`id`);

CREATE UNIQUE INDEX IF NOT EXISTS `enterprise_asset_tenant_code_unique` ON `enterprise_asset` (`tenant_id`,`asset_code`) WHERE "enterprise_asset"."asset_code" IS NOT NULL;

CREATE INDEX IF NOT EXISTS `enterprise_asset_tenant_status_idx` ON `enterprise_asset` (`tenant_id`,`status`,`id`);
