CREATE TABLE `admin_browser` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cdp_url` text NOT NULL,
	`auth_token` text,
	`is_default` integer DEFAULT false NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
