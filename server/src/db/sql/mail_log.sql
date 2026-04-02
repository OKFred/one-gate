CREATE TABLE IF NOT EXISTS mail_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mail_to TEXT NOT NULL,
    mail_from TEXT NOT NULL,
    title TEXT NOT NULL,
    template_id TEXT,
    template_params TEXT,
    send_status INTEGER NOT NULL,
    exception_code TEXT,
    exception_details TEXT,
    remark TEXT,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER DEFAULT (
      CAST(strftime('%s', 'now') AS INTEGER) * 1000 +
      CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)
    ),
    update_time_utc INTEGER
);

CREATE INDEX IF NOT EXISTS idx_mail_to_time ON mail_log(mail_to, create_time_utc);
CREATE INDEX IF NOT EXISTS idx_send_status ON mail_log(send_status);
CREATE INDEX IF NOT EXISTS idx_template_id ON mail_log(template_id);
CREATE INDEX IF NOT EXISTS idx_create_time ON mail_log(create_time_utc);
