CREATE TABLE IF NOT EXISTS `enterprise_asset_assignment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	`host_asset_id` integer,
	`location` text NOT NULL,
	`valid_from_utc` integer NOT NULL,
	`valid_to_utc` integer,
	`reason` text NOT NULL,
	`close_reason` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer,
	FOREIGN KEY (`tenant_id`,`asset_id`) REFERENCES `enterprise_asset`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`,`host_asset_id`) REFERENCES `enterprise_asset`(`tenant_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enterprise_asset_assignment_interval_check" CHECK("enterprise_asset_assignment"."valid_from_utc" >= 0 AND ("enterprise_asset_assignment"."valid_to_utc" IS NULL OR "enterprise_asset_assignment"."valid_to_utc" > "enterprise_asset_assignment"."valid_from_utc")),
	CONSTRAINT "enterprise_asset_assignment_not_self_check" CHECK("enterprise_asset_assignment"."host_asset_id" IS NULL OR "enterprise_asset_assignment"."asset_id" != "enterprise_asset_assignment"."host_asset_id")
);

CREATE INDEX IF NOT EXISTS `enterprise_asset_assignment_interval_idx` ON `enterprise_asset_assignment` (`tenant_id`,`asset_id`,`valid_from_utc`);

CREATE INDEX IF NOT EXISTS `enterprise_asset_assignment_host_idx` ON `enterprise_asset_assignment` (`tenant_id`,`host_asset_id`,`valid_to_utc`);
