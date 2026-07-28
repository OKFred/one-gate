CREATE TABLE IF NOT EXISTS `admin_voice_session_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_id` text NOT NULL,
	`meeting_title` text,
	`status` text NOT NULL,
	`task_id` text NOT NULL,
	`creator_id` integer NOT NULL,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer,
	`end_time_utc` integer
);

CREATE INDEX IF NOT EXISTS `idx_voice_meeting_id` ON `admin_voice_session_log` (`meeting_id`);
CREATE INDEX IF NOT EXISTS `idx_voice_creator_status` ON `admin_voice_session_log` (`creator_id`, `status`);
