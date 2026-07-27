CREATE TABLE IF NOT EXISTS `personal_financial_data_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_name` text NOT NULL,
	`source_type` text NOT NULL,
	`api_task_id` integer,
	`schema_form_code` text,
	`field_mapping_json` text NOT NULL,
	`sync_cron` text,
	`is_enabled` integer NOT NULL,
	`last_sync_time_utc` integer,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`updater_id` integer,
	`updater_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
