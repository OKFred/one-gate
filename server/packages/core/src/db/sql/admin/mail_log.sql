CREATE TABLE `mail_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mail_to` text NOT NULL,
	`mail_from` text NOT NULL,
	`title` text NOT NULL,
	`template_id` text,
	`template_params` text,
	`send_status` integer NOT NULL,
	`exception_code` text,
	`exception_details` text,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE INDEX `idx_mail_to_time` ON `mail_log` (`mail_to`,`create_time_utc`);

CREATE INDEX `idx_send_status` ON `mail_log` (`send_status`);

CREATE INDEX `idx_template_id` ON `mail_log` (`template_id`);

CREATE INDEX `idx_create_time` ON `mail_log` (`create_time_utc`);
