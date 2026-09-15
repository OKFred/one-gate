-- Pause related writes before applying this migration and deploying the new runtime.
-- Preserve AUTOINCREMENT history even when the highest old ID was deleted.
CREATE TABLE `_department_soft_delete_sequence` (`seq` integer NOT NULL);
--> statement-breakpoint
INSERT INTO `_department_soft_delete_sequence` (`seq`)
SELECT COALESCE(MAX(`seq`), 0) FROM `sqlite_sequence` WHERE `name` = 'system_department';
--> statement-breakpoint

CREATE TABLE `__new_system_department` (
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
	CONSTRAINT "system_department_soft_delete_state_check" CHECK(("__new_system_department"."is_deleted" = 0 AND "__new_system_department"."deleted_time_utc" IS NULL AND "__new_system_department"."deleter_id" IS NULL) OR ("__new_system_department"."is_deleted" = 1 AND "__new_system_department"."deleted_time_utc" IS NOT NULL AND "__new_system_department"."deleter_id" IS NOT NULL))
);
--> statement-breakpoint

INSERT INTO `__new_system_department` (
  `id`, `name`, `parent_id`, `remark`, `is_enabled`, `creator_id`,
  `updater_id`, `create_time_utc`, `update_time_utc`,
  `is_deleted`, `deleted_time_utc`, `deleter_id`
)
SELECT `id`, `name`, `parent_id`, `remark`, `is_enabled`, `creator_id`,
  `updater_id`, `create_time_utc`, `update_time_utc`, 0, NULL, NULL
FROM `system_department`;
--> statement-breakpoint
DROP TABLE `system_department`;
--> statement-breakpoint
ALTER TABLE `__new_system_department` RENAME TO `system_department`;
--> statement-breakpoint
INSERT INTO `sqlite_sequence` (`name`, `seq`)
SELECT 'system_department', `seq` FROM `_department_soft_delete_sequence`
WHERE NOT EXISTS (SELECT 1 FROM `sqlite_sequence` WHERE `name` = 'system_department');
--> statement-breakpoint
UPDATE `sqlite_sequence`
SET `seq` = MAX(`seq`, (SELECT `seq` FROM `_department_soft_delete_sequence`))
WHERE `name` = 'system_department';
--> statement-breakpoint
DROP TABLE `_department_soft_delete_sequence`;
--> statement-breakpoint


CREATE UNIQUE INDEX `system_department_name_active_unique` ON `system_department` (`name`) WHERE "system_department"."is_deleted" = 0;
--> statement-breakpoint

CREATE INDEX `system_department_deleted_time_idx` ON `system_department` (`is_deleted`,`deleted_time_utc`);
--> statement-breakpoint

CREATE INDEX `system_department_parent_id_idx` ON `system_department` (`parent_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `compliance_archives_department_retention_idx` ON `compliance_archives` (`source_system`,`source_database`,`source_table`,`create_time_utc`);
--> statement-breakpoint
