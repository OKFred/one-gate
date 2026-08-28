CREATE TABLE IF NOT EXISTS `system_sso_oidc_transaction` (
	`id` text PRIMARY KEY NOT NULL,
	`state_digest` text NOT NULL,
	`intent` text NOT NULL,
	`expected_user_id` integer,
	`issuer` text NOT NULL,
	`client_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`encrypted_code_verifier` text NOT NULL,
	`nonce_digest` text NOT NULL,
	`expires_at_utc` integer NOT NULL,
	`consumed_at_utc` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `system_sso_oidc_transaction_state_unique` ON `system_sso_oidc_transaction` (`state_digest`);

CREATE INDEX IF NOT EXISTS `system_sso_oidc_transaction_expiry_idx` ON `system_sso_oidc_transaction` (`expires_at_utc`);

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
