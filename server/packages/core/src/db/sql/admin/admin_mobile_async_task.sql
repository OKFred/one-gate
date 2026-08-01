CREATE TABLE IF NOT EXISTS `admin_mobile_async_task` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text NOT NULL,
	`client_id` text NOT NULL,
	`cat` text NOT NULL,
	`script` text NOT NULL,
	`status` text NOT NULL,
	`result_message` text,
	`expires_at_utc` integer NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `admin_mobile_async_task_id_unique` ON `admin_mobile_async_task` (`task_id`);
