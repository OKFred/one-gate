CREATE TABLE IF NOT EXISTS i18n_language (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lang_code TEXT NOT NULL,
    native_name TEXT NOT NULL,
    is_enabled INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    remark TEXT,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_language_code ON i18n_language(lang_code);
