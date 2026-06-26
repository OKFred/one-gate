CREATE TABLE IF NOT EXISTS enterprise_workflow_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    start_time_utc INTEGER NOT NULL,
    end_time_utc INTEGER,
    logs TEXT,
    creator_id INTEGER NOT NULL,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    )
);
