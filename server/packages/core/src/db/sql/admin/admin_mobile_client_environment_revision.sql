CREATE TABLE IF NOT EXISTS admin_mobile_client_environment_revision (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  environment_id INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  config_json TEXT NOT NULL,
  required_secret_keys_json TEXT NOT NULL,
  creator_id INTEGER NOT NULL,
  create_time_utc INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER))
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_mobile_client_env_revision_unique ON admin_mobile_client_environment_revision (environment_id, revision);
