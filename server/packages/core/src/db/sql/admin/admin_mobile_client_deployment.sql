CREATE TABLE IF NOT EXISTS admin_mobile_client_deployment (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  deployment_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  active_client_id TEXT,
  release_id INTEGER NOT NULL,
  release_version TEXT NOT NULL,
  release_digest TEXT NOT NULL,
  environment_revision_id INTEGER NOT NULL,
  environment TEXT NOT NULL,
  environment_revision INTEGER NOT NULL,
  activation_mode TEXT NOT NULL,
  drain_timeout_ms INTEGER NOT NULL,
  phase TEXT NOT NULL,
  previous_release_version TEXT,
  previous_release_digest TEXT,
  previous_environment TEXT,
  previous_environment_revision INTEGER,
  result_code TEXT,
  result_message TEXT,
  expires_at_utc INTEGER NOT NULL,
  started_at_utc INTEGER,
  finished_at_utc INTEGER,
  creator_id INTEGER NOT NULL,
  updater_id INTEGER,
  create_time_utc INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)),
  update_time_utc INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_mobile_client_deployment_id_unique ON admin_mobile_client_deployment (deployment_id);
CREATE UNIQUE INDEX IF NOT EXISTS admin_mobile_client_deployment_active_device_unique ON admin_mobile_client_deployment (active_client_id);
CREATE INDEX IF NOT EXISTS admin_mobile_client_deployment_device_time_idx ON admin_mobile_client_deployment (client_id, create_time_utc);
CREATE INDEX IF NOT EXISTS admin_mobile_client_deployment_phase_idx ON admin_mobile_client_deployment (phase);
