CREATE TABLE `mail_template` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`title` text NOT NULL,
	`lang_code` text NOT NULL,
	`content` text NOT NULL,
	`category` text,
	`is_enabled` integer NOT NULL,
	`scope` text DEFAULT 'sys' NOT NULL,
	`tenant_id` integer,
	`user_id` integer,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX `mail_template_name_unique` ON `mail_template` (`name`);

CREATE UNIQUE INDEX `idx_template_name` ON `mail_template` (`name`);
