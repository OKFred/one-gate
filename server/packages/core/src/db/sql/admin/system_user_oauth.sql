CREATE TABLE IF NOT EXISTS `system_user_oauth` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_username` text,
	`provider_tenant_id` text,
	`encrypted_profile` text,
	`encrypted_access_token` text,
	`encrypted_refresh_token` text,
	`scopes` text,
	`token_expires_at_utc` integer,
	`last_verified_at_utc` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `system_user_oauth_provider_identity_unique` ON `system_user_oauth` (`provider`,`provider_id`);

CREATE UNIQUE INDEX IF NOT EXISTS `system_user_oauth_user_provider_unique` ON `system_user_oauth` (`user_id`,`provider`);
