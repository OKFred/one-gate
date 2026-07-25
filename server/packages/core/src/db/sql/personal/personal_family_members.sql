CREATE TABLE `personal_family_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`is_self` integer DEFAULT false NOT NULL,
	`relation_type` text NOT NULL,
	`real_name` text NOT NULL,
	`gender` text,
	`avatar` text,
	`birth_date_utc` integer,
	`phone` text,
	`is_emergency_contact` integer DEFAULT false NOT NULL,
	`health_note` text,
	`remark` text,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`updater_id` integer,
	`updater_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
