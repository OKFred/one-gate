CREATE TABLE IF NOT EXISTS system_cron_job_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    status INTEGER NOT NULL,
    error_message TEXT,
    start_time_utc INTEGER NOT NULL,
    end_time_utc INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL
);
