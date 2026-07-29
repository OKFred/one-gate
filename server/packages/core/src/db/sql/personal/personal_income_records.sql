CREATE TABLE IF NOT EXISTS `personal_income_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_category` text NOT NULL,
	`amount` real NOT NULL,
	`income_date_utc` integer NOT NULL,
	`payer` text,
	`remark` text,
	`data_task_id` integer,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`updater_id` integer,
	`updater_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
