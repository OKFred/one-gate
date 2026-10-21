-- Enterprise-scoped asset registry. Additive migration; existing business records remain unchanged.
CREATE TABLE `enterprise_asset_assignment` (
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
--> statement-breakpoint
CREATE INDEX `enterprise_asset_assignment_interval_idx` ON `enterprise_asset_assignment` (`tenant_id`,`asset_id`,`valid_from_utc`);--> statement-breakpoint
CREATE INDEX `enterprise_asset_assignment_host_idx` ON `enterprise_asset_assignment` (`tenant_id`,`host_asset_id`,`valid_to_utc`);--> statement-breakpoint
CREATE TABLE `enterprise_asset_identifier` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_asset_identifier_verified_unique` ON `enterprise_asset_identifier` (`tenant_id`,`identifier_type`,`namespace`,`normalized_value`) WHERE "enterprise_asset_identifier"."is_verified" = 1;--> statement-breakpoint
CREATE INDEX `enterprise_asset_identifier_asset_idx` ON `enterprise_asset_identifier` (`tenant_id`,`asset_id`);--> statement-breakpoint
CREATE TABLE `enterprise_asset_measurement_binding` (
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
--> statement-breakpoint
CREATE INDEX `enterprise_asset_binding_asset_idx` ON `enterprise_asset_measurement_binding` (`tenant_id`,`asset_id`,`valid_from_utc`);--> statement-breakpoint
CREATE INDEX `enterprise_asset_binding_source_idx` ON `enterprise_asset_measurement_binding` (`tenant_id`,`source_system`,`collector_id`,`device_id`,`metric`,`channel`,`valid_from_utc`);--> statement-breakpoint
CREATE TABLE `enterprise_asset` (
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
--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_asset_public_id_unique` ON `enterprise_asset` (`asset_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_asset_tenant_id_unique` ON `enterprise_asset` (`tenant_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_asset_tenant_code_unique` ON `enterprise_asset` (`tenant_id`,`asset_code`) WHERE "enterprise_asset"."asset_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `enterprise_asset_tenant_status_idx` ON `enterprise_asset` (`tenant_id`,`status`,`id`);--> statement-breakpoint
CREATE TABLE `enterprise_tenant_api_token_grant` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`token_id` integer NOT NULL,
	`is_enabled` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `enterprise_tenant`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enterprise_tenant_api_token_grant_enabled_check" CHECK("enterprise_tenant_api_token_grant"."is_enabled" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_tenant_api_token_grant_token_unique` ON `enterprise_tenant_api_token_grant` (`token_id`);--> statement-breakpoint
CREATE INDEX `enterprise_tenant_api_token_grant_tenant_idx` ON `enterprise_tenant_api_token_grant` (`tenant_id`,`is_enabled`);--> statement-breakpoint
CREATE TABLE `enterprise_tenant_member` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`is_enabled` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `enterprise_tenant`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enterprise_tenant_member_role_check" CHECK("enterprise_tenant_member"."role" IN ('owner','admin','editor','viewer')),
	CONSTRAINT "enterprise_tenant_member_enabled_check" CHECK("enterprise_tenant_member"."is_enabled" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_tenant_member_tenant_user_unique` ON `enterprise_tenant_member` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `enterprise_tenant_member_user_idx` ON `enterprise_tenant_member` (`user_id`,`is_enabled`);--> statement-breakpoint
CREATE TABLE `enterprise_tenant` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`is_enabled` integer NOT NULL,
	`recovery_reason` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	CONSTRAINT "enterprise_tenant_enabled_check" CHECK("enterprise_tenant"."is_enabled" IN (0,1)),
	CONSTRAINT "enterprise_tenant_key_check" CHECK(length("enterprise_tenant"."key") BETWEEN 2 AND 64 AND "enterprise_tenant"."key" NOT GLOB '*[^a-z0-9_-]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_tenant_key_unique` ON `enterprise_tenant` (`key`);
