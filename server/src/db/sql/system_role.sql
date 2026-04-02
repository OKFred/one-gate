CREATE TABLE IF NOT EXISTS system_role (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    remark TEXT,
    is_enabled INTEGER NOT NULL,
    permission_count INTEGER DEFAULT 0,
    data_scope TEXT NOT NULL DEFAULT 'self_only',
    custom_dept_ids TEXT,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);
