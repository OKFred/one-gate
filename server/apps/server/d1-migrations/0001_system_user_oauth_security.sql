ALTER TABLE `system_user_oauth` ADD COLUMN `provider_tenant_id` text;
ALTER TABLE `system_user_oauth` ADD COLUMN `encrypted_profile` text;
ALTER TABLE `system_user_oauth` ADD COLUMN `encrypted_access_token` text;
ALTER TABLE `system_user_oauth` ADD COLUMN `encrypted_refresh_token` text;
ALTER TABLE `system_user_oauth` ADD COLUMN `scopes` text;
ALTER TABLE `system_user_oauth` ADD COLUMN `token_expires_at_utc` integer;
ALTER TABLE `system_user_oauth` ADD COLUMN `last_verified_at_utc` integer;

CREATE UNIQUE INDEX `system_user_oauth_provider_identity_unique`
ON `system_user_oauth` (`provider`, `provider_id`);

CREATE UNIQUE INDEX `system_user_oauth_user_provider_unique`
ON `system_user_oauth` (`user_id`, `provider`);
