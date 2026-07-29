CREATE TABLE IF NOT EXISTS `system_cron_job` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_key` text NOT NULL,
	`name` text NOT NULL,
	`cron_expression` text NOT NULL,
	`status` integer NOT NULL,
	`parameters` text,
	`last_run_time_utc` integer,
	`next_run_time_utc` integer,
	`run_count` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
