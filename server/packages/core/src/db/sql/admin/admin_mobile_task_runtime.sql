CREATE TABLE IF NOT EXISTS `admin_mobile_task_runtime` (
	`client_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`session_started_at` integer NOT NULL,
	`revision` integer NOT NULL,
	`device_time_utc` integer NOT NULL,
	`received_time_utc` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `admin_mobile_device`(`client_id`) ON UPDATE no action ON DELETE cascade
);
