-- Read-only deployment contract. A missing table or column must fail before Worker deploy.
SELECT
  `id`,
  `client_id`,
  `device_name`,
  `is_enabled`,
  `remark`,
  `reported_status`,
  `last_heartbeat_time_utc`,
  `last_online_time_utc`,
  `last_offline_time_utc`,
  `manufacturer`,
  `brand`,
  `model`,
  `android_version`,
  `android_sdk`,
  `autojs6_version`,
  `client_version`,
  `protocol_version`,
  `battery_level`,
  `is_charging`,
  `network_connected`,
  `network_type`,
  `imei_status`,
  `imei_masked_json`,
  `imei_ciphertext`,
  `serial_status`,
  `serial_masked`,
  `serial_ciphertext`,
  `capabilities_json`,
  `reported_extra_json`,
  `custom_metadata_json`,
  `custom_sensitive_metadata_ciphertext`,
  `report_token_hash`,
  `creator_id`,
  `updater_id`,
  `create_time_utc`,
  `update_time_utc`
FROM `admin_mobile_device`
LIMIT 0;

SELECT `id`
FROM `admin_mobile_device` INDEXED BY `admin_mobile_device_last_heartbeat_idx`
LIMIT 0;

SELECT `id`
FROM `admin_mobile_device` INDEXED BY `admin_mobile_device_status_idx`
LIMIT 0;

SELECT
  `id`,
  `event_id`,
  `client_id`,
  `event_type`,
  `event_time_utc`,
  `summary_json`,
  `payload_ciphertext`,
  `create_time_utc`
FROM `admin_mobile_device_event`
LIMIT 0;

SELECT `id`
FROM `admin_mobile_device_event` INDEXED BY `admin_mobile_device_event_client_event_unique`
LIMIT 0;

SELECT `id`
FROM `admin_mobile_device_event` INDEXED BY `admin_mobile_device_event_client_time_idx`
LIMIT 0;

SELECT `id`
FROM `admin_mobile_device_event` INDEXED BY `admin_mobile_device_event_type_idx`
LIMIT 0;

SELECT
  `id`,
  `task_id`,
  `client_id`,
  `cat`,
  `script`,
  `protocol_version`,
  `script_id`,
  `script_version`,
  `params_json`,
  `timeout_ms`,
  `trace_id`,
  `priority`,
  `preempt_running`,
  `preempted_by_task_id`,
  `status`,
  `result_message`,
  `result_code`,
  `result_data_json`,
  `started_at_utc`,
  `finished_at_utc`,
  `expires_at_utc`,
  `remark`,
  `creator_id`,
  `updater_id`,
  `create_time_utc`,
  `update_time_utc`
FROM `admin_mobile_async_task`
LIMIT 0;

SELECT `source` FROM `system_schema_form` LIMIT 0;
