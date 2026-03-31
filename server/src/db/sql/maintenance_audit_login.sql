CREATE TABLE IF NOT EXISTS maintenance_audit_login (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    login_time_utc INTEGER NOT NULL,
    ip TEXT,
    user_agent TEXT,
    remark TEXT,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);

CREATE INDEX IF NOT EXISTS idx_login_audit_user_id ON maintenance_audit_login(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_time ON maintenance_audit_login(login_time_utc);
