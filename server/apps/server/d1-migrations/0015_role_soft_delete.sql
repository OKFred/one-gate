-- Pause role, user-role, role-permission and department-range writes before applying.
-- Malformed or orphan references must be repaired explicitly, never treated as empty arrays.
CREATE TABLE `_role_soft_delete_preflight` (
  `user_role_arrays` integer NOT NULL CHECK (`user_role_arrays` = 0),
  `user_role_ids` integer NOT NULL CHECK (`user_role_ids` = 0),
  `user_role_orphans` integer NOT NULL CHECK (`user_role_orphans` = 0),
  `role_department_arrays` integer NOT NULL CHECK (`role_department_arrays` = 0),
  `role_department_ids` integer NOT NULL CHECK (`role_department_ids` = 0),
  `role_department_orphans` integer NOT NULL CHECK (`role_department_orphans` = 0),
  `role_permission_orphans` integer NOT NULL CHECK (`role_permission_orphans` = 0)
);
--> statement-breakpoint
INSERT INTO `_role_soft_delete_preflight`
-- role-soft-delete-preflight-start
WITH user_roles AS (
  SELECT `id`,
    CASE WHEN json_valid(`role_id_arr`) THEN json_type(`role_id_arr`) = 'array' ELSE 0 END AS valid_array,
    CASE WHEN json_valid(`role_id_arr`) THEN CASE WHEN json_type(`role_id_arr`) = 'array' THEN `role_id_arr` ELSE '[]' END ELSE '[]' END AS ids
  FROM `system_user`
), role_departments AS (
  SELECT `id`,
    CASE WHEN `custom_dept_ids` IS NULL THEN 1 WHEN json_valid(`custom_dept_ids`) THEN json_type(`custom_dept_ids`) = 'array' ELSE 0 END AS valid_array,
    CASE WHEN json_valid(`custom_dept_ids`) THEN CASE WHEN json_type(`custom_dept_ids`) = 'array' THEN `custom_dept_ids` ELSE '[]' END ELSE '[]' END AS ids
  FROM `system_role`
)
SELECT
  (SELECT COUNT(*) FROM user_roles WHERE valid_array = 0) AS user_role_arrays,
  (SELECT COUNT(*) FROM user_roles AS owner WHERE EXISTS (
    SELECT 1 FROM json_each(owner.ids) AS assigned
    WHERE assigned.type != 'integer' OR assigned.value <= 0 OR assigned.value > 9007199254740991
  )) AS user_role_ids,
  (SELECT COUNT(*) FROM user_roles AS owner WHERE EXISTS (
    SELECT 1 FROM json_each(owner.ids) AS assigned
    WHERE NOT EXISTS (SELECT 1 FROM `system_role` AS referenced WHERE referenced.id = assigned.value)
  )) AS user_role_orphans,
  (SELECT COUNT(*) FROM role_departments WHERE valid_array = 0) AS role_department_arrays,
  (SELECT COUNT(*) FROM role_departments AS owner WHERE EXISTS (
    SELECT 1 FROM json_each(owner.ids) AS assigned
    WHERE assigned.type != 'integer' OR assigned.value <= 0 OR assigned.value > 9007199254740991
  )) AS role_department_ids,
  (SELECT COUNT(*) FROM role_departments AS owner WHERE EXISTS (
    SELECT 1 FROM json_each(owner.ids) AS assigned
    WHERE NOT EXISTS (SELECT 1 FROM `system_department` AS referenced WHERE referenced.id = assigned.value)
  )) AS role_department_orphans,
  (SELECT COUNT(*) FROM `system_role_permission` AS binding
   WHERE NOT EXISTS (SELECT 1 FROM `system_role` AS referenced WHERE referenced.id = binding.role_id)) AS role_permission_orphans
-- role-soft-delete-preflight-end
;
--> statement-breakpoint
DROP TABLE `_role_soft_delete_preflight`;
--> statement-breakpoint

-- Preserve AUTOINCREMENT high-water history even for a previously populated empty table.
CREATE TABLE `_role_soft_delete_sequence` (`seq` integer NOT NULL);
--> statement-breakpoint
INSERT INTO `_role_soft_delete_sequence` (`seq`)
SELECT COALESCE(MAX(`seq`), 0) FROM `sqlite_sequence` WHERE `name` = 'system_role';
--> statement-breakpoint

CREATE TABLE `__new_system_role` (
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
  CONSTRAINT "system_role_soft_delete_state_check" CHECK(("__new_system_role"."is_deleted" = 0 AND "__new_system_role"."deleted_time_utc" IS NULL AND "__new_system_role"."deleter_id" IS NULL) OR ("__new_system_role"."is_deleted" = 1 AND "__new_system_role"."deleted_time_utc" IS NOT NULL AND "__new_system_role"."deleter_id" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_system_role` (
  `id`, `name`, `remark`, `is_enabled`, `permission_count`, `data_scope`,
  `custom_dept_ids`, `creator_id`, `updater_id`, `create_time_utc`, `update_time_utc`,
  `is_deleted`, `deleted_time_utc`, `deleter_id`
)
SELECT `id`, `name`, `remark`, `is_enabled`, `permission_count`, `data_scope`,
  `custom_dept_ids`, `creator_id`, `updater_id`, `create_time_utc`, `update_time_utc`,
  0, NULL, NULL FROM `system_role`;
--> statement-breakpoint
DROP TABLE `system_role`;
--> statement-breakpoint
ALTER TABLE `__new_system_role` RENAME TO `system_role`;
--> statement-breakpoint
INSERT INTO `sqlite_sequence` (`name`, `seq`)
SELECT 'system_role', `seq` FROM `_role_soft_delete_sequence`
WHERE NOT EXISTS (SELECT 1 FROM `sqlite_sequence` WHERE `name` = 'system_role');
--> statement-breakpoint
UPDATE `sqlite_sequence`
SET `seq` = MAX(`seq`, (SELECT `seq` FROM `_role_soft_delete_sequence`))
WHERE `name` = 'system_role';
--> statement-breakpoint
DROP TABLE `_role_soft_delete_sequence`;
--> statement-breakpoint
CREATE UNIQUE INDEX `system_role_name_active_unique` ON `system_role` (`name`) WHERE "system_role"."is_deleted" = 0;
--> statement-breakpoint
CREATE INDEX `system_role_deleted_time_idx` ON `system_role` (`is_deleted`,`deleted_time_utc`);
--> statement-breakpoint
