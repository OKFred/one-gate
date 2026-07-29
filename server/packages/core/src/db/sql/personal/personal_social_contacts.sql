CREATE TABLE IF NOT EXISTS `personal_social_contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`real_name` text NOT NULL,
	`relation_circle` text NOT NULL,
	`company` text,
	`position` text,
	`phone` text,
	`email` text,
	`avatar` text,
	`intimacy_level` integer,
	`remark` text,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`updater_id` integer,
	`updater_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
