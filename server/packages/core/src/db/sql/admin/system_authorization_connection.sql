CREATE TABLE IF NOT EXISTS `system_authorization_connection` (
  `id` text PRIMARY KEY NOT NULL,
  `issuer` text NOT NULL,
  `authorization_base_url` text NOT NULL,
  `audience` text NOT NULL,
  `client_id` text NOT NULL,
  `encrypted_client_secret` text NOT NULL,
  `cloudflare_access_client_id` text,
  `encrypted_cloudflare_access_client_secret` text,
  `status` text NOT NULL,
  `config_version` integer NOT NULL,
  `last_tested_at_utc` integer,
  `updated_by_user_id` integer NOT NULL,
  `create_time_utc` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `update_time_utc` integer,
  CONSTRAINT `system_authorization_connection_singleton_check` CHECK (`id` = 'default'),
  CONSTRAINT `system_authorization_connection_status_check` CHECK (`status` IN ('draft', 'ready', 'disabled')),
  CONSTRAINT `system_authorization_connection_version_check` CHECK (`config_version` > 0)
);
