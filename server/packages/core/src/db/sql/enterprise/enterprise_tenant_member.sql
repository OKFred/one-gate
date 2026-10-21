CREATE TABLE IF NOT EXISTS `enterprise_tenant_member` (
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

CREATE UNIQUE INDEX IF NOT EXISTS `enterprise_tenant_member_tenant_user_unique` ON `enterprise_tenant_member` (`tenant_id`,`user_id`);

CREATE INDEX IF NOT EXISTS `enterprise_tenant_member_user_idx` ON `enterprise_tenant_member` (`user_id`,`is_enabled`);
