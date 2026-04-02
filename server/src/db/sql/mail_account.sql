CREATE TABLE IF NOT EXISTS mail_account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mail_address TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nickname TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    is_enabled INTEGER NOT NULL,
    remark TEXT,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);
