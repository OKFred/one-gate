CREATE TABLE IF NOT EXISTS system_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    lang_code TEXT NOT NULL,
    remark TEXT,
    region_id INTEGER,
    department_id INTEGER,
    role_id_arr TEXT NOT NULL,
    is_enabled INTEGER NOT NULL,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);
