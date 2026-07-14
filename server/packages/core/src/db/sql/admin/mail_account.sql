CREATE TABLE `mail_account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mail_address` text NOT NULL,
	`password` text NOT NULL,
	`nickname` text NOT NULL,
	`host` text NOT NULL,
	`port` integer NOT NULL,
	`is_enabled` integer NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX `mail_account_mail_address_unique` ON `mail_account` (`mail_address`);

CREATE UNIQUE INDEX `idx_mail_address` ON `mail_account` (`mail_address`);
