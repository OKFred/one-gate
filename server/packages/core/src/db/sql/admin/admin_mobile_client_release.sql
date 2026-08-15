CREATE TABLE IF NOT EXISTS admin_mobile_client_release (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  release_version TEXT NOT NULL,
  artifact_key TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  artifact_size INTEGER NOT NULL,
  manifest_json TEXT NOT NULL,
  status TEXT NOT NULL,
  release_notes TEXT,
  creator_id INTEGER NOT NULL,
  updater_id INTEGER,
  create_time_utc INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)),
  update_time_utc INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_mobile_client_release_version_unique ON admin_mobile_client_release (release_version);
CREATE UNIQUE INDEX IF NOT EXISTS admin_mobile_client_release_digest_unique ON admin_mobile_client_release (artifact_sha256);
CREATE INDEX IF NOT EXISTS admin_mobile_client_release_status_idx ON admin_mobile_client_release (status);
