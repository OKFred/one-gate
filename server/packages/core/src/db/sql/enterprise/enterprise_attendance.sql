CREATE TABLE `enterprise_attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`date` text NOT NULL,
	`check_in_time` integer,
	`check_out_time` integer,
	`status` integer DEFAULT 0 NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
