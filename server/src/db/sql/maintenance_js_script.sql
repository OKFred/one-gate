CREATE TABLE IF NOT EXISTS maintenance_js_script (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    is_enabled INTEGER NOT NULL,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);
