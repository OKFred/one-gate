CREATE TABLE `admin_mobile_device_ops_session` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `session_id` text NOT NULL,
  `active_client_id` text,
  `client_id` text NOT NULL,
  `actor_id` integer NOT NULL,
  `actor_name` text NOT NULL,
  `status` text NOT NULL,
  `connected_at_utc` integer,
  `last_active_at_utc` integer,
  `expires_at_utc` integer NOT NULL,
  `closed_at_utc` integer,
  `close_code` text,
  `close_message` text,
  `create_time_utc` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `update_time_utc` integer
);
CREATE UNIQUE INDEX `admin_mobile_device_ops_session_id_unique`
  ON `admin_mobile_device_ops_session` (`session_id`);
CREATE UNIQUE INDEX `admin_mobile_device_ops_active_client_unique`
  ON `admin_mobile_device_ops_session` (`active_client_id`);
CREATE INDEX `admin_mobile_device_ops_client_time_idx`
  ON `admin_mobile_device_ops_session` (`client_id`, `create_time_utc`);

CREATE TABLE `admin_mobile_device_ops_audit` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `session_id` text NOT NULL,
  `request_id` text NOT NULL,
  `client_id` text NOT NULL,
  `actor_id` integer NOT NULL,
  `operation` text NOT NULL,
  `status` text NOT NULL,
  `result_code` text,
  `duration_ms` integer,
  `request_bytes` integer NOT NULL,
  `response_bytes` integer,
  `request_ciphertext` text NOT NULL,
  `response_ciphertext` text,
  `create_time_utc` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `finish_time_utc` integer
);
CREATE UNIQUE INDEX `admin_mobile_device_ops_audit_request_unique`
  ON `admin_mobile_device_ops_audit` (`session_id`, `request_id`);
CREATE INDEX `admin_mobile_device_ops_audit_client_time_idx`
  ON `admin_mobile_device_ops_audit` (`client_id`, `create_time_utc`);
