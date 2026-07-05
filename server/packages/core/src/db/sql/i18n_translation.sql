CREATE TABLE IF NOT EXISTS i18n_translation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application TEXT NOT NULL,
    business TEXT NOT NULL,
    lang_code TEXT NOT NULL,
    t_key TEXT NOT NULL,
    t_value TEXT NOT NULL,
    value_hash TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_value_hash ON i18n_translation(value_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tkey_langcode ON i18n_translation(t_key, lang_code);
