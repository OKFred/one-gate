CREATE TABLE IF NOT EXISTS `system_user_sso_identity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`issuer` text NOT NULL,
	`subject` text NOT NULL,
	`principal_user_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`membership_id` text NOT NULL,
	`client_id` text NOT NULL,
	`amr` text NOT NULL,
	`scope` text NOT NULL,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `system_user_sso_identity_issuer_subject_unique` ON `system_user_sso_identity` (`issuer`,`subject`);

CREATE UNIQUE INDEX IF NOT EXISTS `system_user_sso_identity_user_issuer_unique` ON `system_user_sso_identity` (`user_id`,`issuer`);
