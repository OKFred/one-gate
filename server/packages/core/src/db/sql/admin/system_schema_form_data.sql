CREATE TABLE `system_schema_form_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`form_code` text NOT NULL,
	`business_id` integer NOT NULL,
	`data_content` text NOT NULL,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`updater_id` integer,
	`updater_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
