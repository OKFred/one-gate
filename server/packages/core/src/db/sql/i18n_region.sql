CREATE TABLE IF NOT EXISTS i18n_region (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    labels TEXT NOT NULL,
    alpha2_code TEXT NOT NULL,
    alpha3_code TEXT NOT NULL,
    numeric INTEGER NOT NULL,
    iso_3166_independent INTEGER NOT NULL,
    business_languages TEXT,
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_region_alpha2 ON i18n_region(alpha2_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_region_alpha3 ON i18n_region(alpha3_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_region_numeric ON i18n_region(numeric);
