CREATE TABLE IF NOT EXISTS `system_department` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer,
	`remark` text,
	`is_enabled` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer,
	`is_deleted` integer NOT NULL,
	`deleted_time_utc` integer,
	`deleter_id` integer,
	CONSTRAINT "system_department_soft_delete_state_check" CHECK(("system_department"."is_deleted" = 0 AND "system_department"."deleted_time_utc" IS NULL AND "system_department"."deleter_id" IS NULL) OR ("system_department"."is_deleted" = 1 AND "system_department"."deleted_time_utc" IS NOT NULL AND "system_department"."deleter_id" IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS `system_department_name_active_unique` ON `system_department` (`name`) WHERE "system_department"."is_deleted" = 0;
CREATE INDEX IF NOT EXISTS `system_department_deleted_time_idx` ON `system_department` (`is_deleted`,`deleted_time_utc`);
CREATE INDEX IF NOT EXISTS `system_department_parent_id_idx` ON `system_department` (`parent_id`);