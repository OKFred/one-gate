CREATE TABLE `system_user` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`lang_code` text NOT NULL,
	`remark` text,
	`region_id` integer,
	`department_id` integer,
	`role_id_arr` text NOT NULL,
	`is_enabled` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX `system_user_username_unique` ON `system_user` (`username`);
