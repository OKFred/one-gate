CREATE TABLE `personal_social_relations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_contact_id` integer NOT NULL,
	`target_contact_id` integer NOT NULL,
	`relation_type` text NOT NULL,
	`relation_label` text NOT NULL,
	`intimacy_score` integer DEFAULT 80,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`updater_id` integer,
	`updater_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
