CREATE TABLE IF NOT EXISTS enterprise_workflow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    flow_data TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    remark TEXT,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);
