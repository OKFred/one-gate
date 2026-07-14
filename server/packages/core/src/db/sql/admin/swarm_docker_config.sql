CREATE TABLE `swarm_docker_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`host` text NOT NULL,
	`api_version` text,
	`tls_verify` integer NOT NULL,
	`ca_cert` text,
	`client_cert` text,
	`client_key` text,
	`cf_mtls_binding` text,
	`is_enabled` integer NOT NULL,
	`is_default` integer NOT NULL,
	`remark` text,
	`creator_id` integer NOT NULL,
	`updater_id` integer,
	`create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
	`update_time_utc` integer
);
