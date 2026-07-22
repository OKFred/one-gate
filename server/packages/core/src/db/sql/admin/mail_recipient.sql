CREATE TABLE `mail_recipient` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`scope` text DEFAULT 'biz' NOT NULL,
	`tenant_id` integer,
	`user_id` integer,
	`remote_login_warn` integer DEFAULT true NOT NULL,
	`marketing_edm` integer DEFAULT true NOT NULL,
	`tags` text,
	`remark` text,
	`creator_id` integer,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
