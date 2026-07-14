CREATE TABLE `system_department` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer,
	`remark` text,
	`is_enabled` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX `system_department_name_unique` ON `system_department` (`name`);
