CREATE TABLE IF NOT EXISTS `system_oauth_state` (
	`state_digest` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`intent` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`user_id` integer,
	`expires_at_utc` integer NOT NULL,
	`consumed_at_utc` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL
);

CREATE INDEX IF NOT EXISTS `system_oauth_state_expiry_idx` ON `system_oauth_state` (`expires_at_utc`);
