CREATE TABLE IF NOT EXISTS `enterprise_tenant_api_token_grant` (
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

CREATE UNIQUE INDEX IF NOT EXISTS `enterprise_tenant_api_token_grant_token_unique` ON `enterprise_tenant_api_token_grant` (`token_id`);

CREATE INDEX IF NOT EXISTS `enterprise_tenant_api_token_grant_tenant_idx` ON `enterprise_tenant_api_token_grant` (`tenant_id`,`is_enabled`);
