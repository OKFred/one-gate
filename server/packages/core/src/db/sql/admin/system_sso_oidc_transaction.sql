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
