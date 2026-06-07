CREATE TABLE IF NOT EXISTS swarm_docker_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    api_version TEXT,
    tls_verify INTEGER NOT NULL,
    ca_cert TEXT,
    client_cert TEXT,
    client_key TEXT,
    cf_mtls_binding TEXT,
    is_enabled INTEGER NOT NULL,
    is_default INTEGER NOT NULL,
    remark TEXT,
    creator_id INTEGER NOT NULL,
    updater_id INTEGER,
    create_time_utc INTEGER NOT NULL DEFAULT(strftime ('%s', 'now') * 1000),
    update_time_utc INTEGER
);