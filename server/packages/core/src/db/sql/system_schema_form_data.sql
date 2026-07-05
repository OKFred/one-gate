CREATE TABLE IF NOT EXISTS system_schema_form_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_code TEXT NOT NULL,
    business_id INTEGER NOT NULL,
    data_content TEXT NOT NULL,
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
