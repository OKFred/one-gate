CREATE TABLE IF NOT EXISTS `personal_expense_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expense_category` text NOT NULL,
	`amount` real NOT NULL,
	`expense_date_utc` integer NOT NULL,
	`payee` text,
	`payment_method` text,
	`remark` text,
	`data_task_id` integer,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`updater_id` integer,
	`updater_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
