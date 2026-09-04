CREATE TABLE IF NOT EXISTS `system_sso_connection` (
  `id` text PRIMARY KEY NOT NULL,
  `issuer` text NOT NULL,
  `client_id` text NOT NULL,
  `audience` text NOT NULL,
  `allowed_tenant_id` text NOT NULL,
  `redirect_uris_json` text NOT NULL,
  `status` text NOT NULL,
  `config_version` integer NOT NULL,
  `last_tested_at_utc` integer,
  `updated_by_user_id` integer,
  `create_time_utc` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `update_time_utc` integer,
  CONSTRAINT `system_sso_connection_singleton_check` CHECK (`id` = 'default'),
  CONSTRAINT `system_sso_connection_status_check` CHECK (`status` IN ('draft', 'ready', 'disabled')),
  CONSTRAINT `system_sso_connection_version_check` CHECK (`config_version` > 0)
);
