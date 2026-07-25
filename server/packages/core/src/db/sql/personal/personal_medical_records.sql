CREATE TABLE `personal_medical_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`hospital_name` text,
	`doctor_name` text,
	`visit_date_utc` integer NOT NULL,
	`diagnosis` text,
	`prescription` text,
	`report_url` text,
	`cost` real DEFAULT 0,
	`remark` text,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`updater_id` integer,
	`updater_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
