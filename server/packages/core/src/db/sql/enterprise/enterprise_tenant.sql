CREATE TABLE IF NOT EXISTS `enterprise_tenant` (
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

CREATE UNIQUE INDEX IF NOT EXISTS `enterprise_tenant_key_unique` ON `enterprise_tenant` (`key`);
