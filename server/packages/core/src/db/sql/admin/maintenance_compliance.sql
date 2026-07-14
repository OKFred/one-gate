CREATE TABLE IF NOT EXISTS compliance_archives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_system TEXT NOT NULL DEFAULT 'self',
    source_database TEXT NOT NULL DEFAULT 'self',
    source_table TEXT NOT NULL,
    source_primary_key TEXT NOT NULL,
    delete_reason TEXT,
    delete_type TEXT,
    record_snapshot TEXT,
    remark TEXT,
    restorable INTEGER NOT NULL,
    restore_until_time_utc INTEGER,
    restored_time_utc INTEGER,
    restorer_id INTEGER,
    compliance_note TEXT,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);
