CREATE TABLE IF NOT EXISTS `base_http_request_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` integer,
	`namespace` text NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`creator_name` text,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`method` text NOT NULL,
	`url` text NOT NULL,
	`protocol` text,
	`host` text,
	`path` text,
	`query` text,
	`request_headers` text,
	`request_body` text,
	`response_status` integer,
	`response_headers` text,
	`response_body` text,
	`duration_ms` integer,
	`error_message` text
);

CREATE INDEX IF NOT EXISTS `idx_http_req_log_namespace` ON `base_http_request_log` (`namespace`);

CREATE INDEX IF NOT EXISTS `idx_http_req_log_tenant` ON `base_http_request_log` (`tenant_id`);

CREATE INDEX IF NOT EXISTS `idx_http_req_log_time` ON `base_http_request_log` (`create_time_utc`);
