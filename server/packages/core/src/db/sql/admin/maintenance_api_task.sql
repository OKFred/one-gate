CREATE TABLE `maintenance_api_task` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_key` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`base_url` text NOT NULL,
	`path` text NOT NULL,
	`method` text DEFAULT 'GET' NOT NULL,
	`headers` text,
	`request_schema` text,
	`response_schema` text,
	`timeout_ms` integer DEFAULT 30000 NOT NULL,
	`is_enabled` integer NOT NULL,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
