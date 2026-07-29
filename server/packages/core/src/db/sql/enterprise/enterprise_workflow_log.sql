CREATE TABLE IF NOT EXISTS `enterprise_workflow_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`status` text NOT NULL,
	`trigger_type` text NOT NULL,
	`start_time_utc` integer NOT NULL,
	`end_time_utc` integer,
	`logs` text,
	`creator_id` integer NOT NULL,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL
);
