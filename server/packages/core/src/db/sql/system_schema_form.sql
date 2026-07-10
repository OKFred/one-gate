CREATE TABLE IF NOT EXISTS system_schema_form (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    schema_data TEXT NOT NULL,
    ui_schema_data TEXT,
    remark TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    source TEXT NOT NULL DEFAULT 'user',
    creator_id INTEGER NOT NULL,
    creator_name TEXT,
    updater_id INTEGER,
    updater_name TEXT,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);
