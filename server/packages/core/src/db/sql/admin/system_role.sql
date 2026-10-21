CREATE TABLE IF NOT EXISTS `system_role` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`remark` text,
	`is_enabled` integer NOT NULL,
	`permission_count` integer NOT NULL,
	`data_scope` text NOT NULL,
	`custom_dept_ids` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer,
	`is_deleted` integer NOT NULL,
	`deleted_time_utc` integer,
	`deleter_id` integer,
	CONSTRAINT "system_role_soft_delete_state_check" CHECK(("system_role"."is_deleted" = 0 AND "system_role"."deleted_time_utc" IS NULL AND "system_role"."deleter_id" IS NULL) OR ("system_role"."is_deleted" = 1 AND "system_role"."deleted_time_utc" IS NOT NULL AND "system_role"."deleter_id" IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS `system_role_name_active_unique` ON `system_role` (`name`) WHERE "system_role"."is_deleted" = 0;
CREATE INDEX IF NOT EXISTS `system_role_deleted_time_idx` ON `system_role` (`is_deleted`,`deleted_time_utc`);
