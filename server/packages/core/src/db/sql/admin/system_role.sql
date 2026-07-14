CREATE TABLE `system_role` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`remark` text,
	`is_enabled` integer NOT NULL,
	`permission_count` integer DEFAULT 0 NOT NULL,
	`data_scope` text DEFAULT 'self_only' NOT NULL,
	`custom_dept_ids` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX `system_role_name_unique` ON `system_role` (`name`);
