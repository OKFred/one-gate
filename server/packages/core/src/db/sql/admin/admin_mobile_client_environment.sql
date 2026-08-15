CREATE TABLE IF NOT EXISTS admin_mobile_client_environment (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  active_revision_id INTEGER,
  is_enabled INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  updater_id INTEGER,
  create_time_utc INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)),
  update_time_utc INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_mobile_client_environment_name_unique ON admin_mobile_client_environment (name);
