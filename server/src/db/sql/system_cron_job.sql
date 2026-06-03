CREATE TABLE IF NOT EXISTS system_cron_job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_key TEXT NOT NULL,
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    status INTEGER NOT NULL DEFAULT 1,
    parameters TEXT,
    last_run_time_utc INTEGER,
    next_run_time_utc INTEGER,
    run_count INTEGER NOT NULL DEFAULT 0,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);
