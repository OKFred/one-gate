CREATE TABLE `system_cron_job_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`status` integer NOT NULL,
	`error_message` text,
	`response_body` text,
	`start_time_utc` integer NOT NULL,
	`end_time_utc` integer NOT NULL,
	`duration_ms` integer NOT NULL
);
