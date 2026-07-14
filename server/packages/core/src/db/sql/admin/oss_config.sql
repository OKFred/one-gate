CREATE TABLE `oss_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`endpoint` text,
	`account_id` text,
	`access_key` text NOT NULL,
	`secret_key` text NOT NULL,
	`bucket` text NOT NULL,
	`region` text DEFAULT 'auto',
	`is_enabled` integer NOT NULL,
	`is_default` integer NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
