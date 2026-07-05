CREATE TABLE IF NOT EXISTS system_menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    path TEXT,
    parent_id INTEGER,
    sort INTEGER NOT NULL,
    business TEXT NOT NULL,
    remark TEXT,
    is_enabled INTEGER NOT NULL,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);
