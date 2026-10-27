-- Read-only deployment contract. A missing table or column must fail before Worker deploy.
-- role-soft-delete-contract-start
SELECT `id`, `name`, `permission_count`, `custom_dept_ids`, `is_deleted`, `deleted_time_utc`, `deleter_id`
FROM `system_role` LIMIT 0;
SELECT `id` FROM `system_role`
INDEXED BY `system_role_name_active_unique` WHERE `is_deleted` = 0 LIMIT 0;
SELECT `id` FROM `system_role`
INDEXED BY `system_role_deleted_time_idx` LIMIT 0;
-- A failed CASE intentionally produces invalid JSON so contract execution cannot pass silently.
WITH role_schema AS (
  SELECT name, type,
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, '"', ''), '`', ''), ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), '')) AS definition
  FROM sqlite_master
)
SELECT json(CASE WHEN
  EXISTS (
    SELECT 1 FROM role_schema WHERE type = 'table' AND name = 'system_role'
      AND INSTR(definition, 'constraintsystem_role_soft_delete_state_checkcheck((system_role.is_deleted=0andsystem_role.deleted_time_utcisnullandsystem_role.deleter_idisnull)or(system_role.is_deleted=1andsystem_role.deleted_time_utcisnotnullandsystem_role.deleter_idisnotnull))') > 0
  )
  AND (SELECT COUNT(*) FROM pragma_table_info('system_role') WHERE
    LOWER(type) = 'integer' AND dflt_value IS NULL AND (
      (name = 'is_deleted' AND "notnull" = 1)
      OR (name IN ('deleted_time_utc', 'deleter_id') AND "notnull" = 0)
    )) = 3
  AND EXISTS (SELECT 1 FROM pragma_index_list('system_role') WHERE name = 'system_role_name_active_unique' AND "unique" = 1 AND partial = 1)
  AND (SELECT COUNT(*) FROM pragma_index_info('system_role_name_active_unique')) = 1
  AND EXISTS (SELECT 1 FROM pragma_index_info('system_role_name_active_unique') WHERE seqno = 0 AND name = 'name')
  AND EXISTS (SELECT 1 FROM role_schema WHERE type = 'index' AND name = 'system_role_name_active_unique' AND SUBSTR(definition, -LENGTH('wheresystem_role.is_deleted=0')) = 'wheresystem_role.is_deleted=0')
  AND EXISTS (SELECT 1 FROM pragma_index_list('system_role') WHERE name = 'system_role_deleted_time_idx' AND "unique" = 0 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('system_role_deleted_time_idx')) = 2
  AND EXISTS (SELECT 1 FROM pragma_index_info('system_role_deleted_time_idx') WHERE seqno = 0 AND name = 'is_deleted')
  AND EXISTS (SELECT 1 FROM pragma_index_info('system_role_deleted_time_idx') WHERE seqno = 1 AND name = 'deleted_time_utc')
THEN '{}' ELSE 'invalid role soft-delete schema' END) AS role_soft_delete_schema_contract;
-- role-soft-delete-contract-end

SELECT `id`, `name`, `parent_id`, `is_deleted`, `deleted_time_utc`, `deleter_id`
FROM `system_department` LIMIT 0;
SELECT `id` FROM `system_department`
INDEXED BY `system_department_name_active_unique` WHERE `is_deleted` = 0 LIMIT 0;
SELECT `id` FROM `system_department`
INDEXED BY `system_department_deleted_time_idx` LIMIT 0;
SELECT `id` FROM `system_department`
INDEXED BY `system_department_parent_id_idx` LIMIT 0;
SELECT `id` FROM `compliance_archives`
INDEXED BY `compliance_archives_department_retention_idx` LIMIT 0;

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
  `id`, `session_id`, `active_client_id`, `client_id`, `actor_id`,
  `actor_name`, `status`, `connected_at_utc`, `last_active_at_utc`,
  `expires_at_utc`, `closed_at_utc`, `close_code`, `close_message`,
  `create_time_utc`, `update_time_utc`
FROM `admin_mobile_device_ops_session`
LIMIT 0;

SELECT `id`
FROM `admin_mobile_device_ops_session`
INDEXED BY `admin_mobile_device_ops_active_client_unique`
LIMIT 0;

SELECT
  `id`, `session_id`, `request_id`, `client_id`, `actor_id`,
  `operation`, `status`, `result_code`, `duration_ms`, `request_bytes`,
  `response_bytes`, `request_ciphertext`, `response_ciphertext`,
  `create_time_utc`, `finish_time_utc`
FROM `admin_mobile_device_ops_audit`
LIMIT 0;

SELECT `id`
FROM `admin_mobile_device_ops_audit`
INDEXED BY `admin_mobile_device_ops_audit_request_unique`
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

SELECT
  `id`,
  `user_id`,
  `provider`,
  `provider_id`,
  `provider_username`,
  `provider_tenant_id`,
  `encrypted_profile`,
  `encrypted_access_token`,
  `encrypted_refresh_token`,
  `scopes`,
  `token_expires_at_utc`,
  `last_verified_at_utc`,
  `create_time_utc`,
  `update_time_utc`
FROM `system_user_oauth`
LIMIT 0;

SELECT `id`
FROM `system_user_oauth` INDEXED BY `system_user_oauth_provider_identity_unique`
LIMIT 0;

SELECT `id`
FROM `system_user_oauth` INDEXED BY `system_user_oauth_user_provider_unique`
LIMIT 0;

SELECT
  `state_digest`,
  `provider`,
  `intent`,
  `redirect_uri`,
  `user_id`,
  `expires_at_utc`,
  `consumed_at_utc`,
  `create_time_utc`
FROM `system_oauth_state`
LIMIT 0;

SELECT `state_digest`
FROM `system_oauth_state` INDEXED BY `system_oauth_state_expiry_idx`
LIMIT 0;

SELECT
  `id`,
  `user_id`,
  `issuer`,
  `subject`,
  `principal_user_id`,
  `tenant_id`,
  `membership_id`,
  `client_id`,
  `amr`,
  `scope`,
  `create_time_utc`,
  `update_time_utc`
FROM `system_user_sso_identity`
LIMIT 0;

SELECT `id`
FROM `system_user_sso_identity`
INDEXED BY `system_user_sso_identity_issuer_subject_unique`
LIMIT 0;

SELECT `id`
FROM `system_user_sso_identity`
INDEXED BY `system_user_sso_identity_user_issuer_unique`
LIMIT 0;

SELECT
  `id`,
  `state_digest`,
  `intent`,
  `expected_user_id`,
  `issuer`,
  `client_id`,
  `tenant_id`,
  `redirect_uri`,
  `encrypted_code_verifier`,
  `nonce_digest`,
  `expires_at_utc`,
  `consumed_at_utc`,
  `create_time_utc`
FROM `system_sso_oidc_transaction`
LIMIT 0;

SELECT `id`
FROM `system_sso_oidc_transaction`
INDEXED BY `system_sso_oidc_transaction_state_unique`
LIMIT 0;

SELECT `id`
FROM `system_sso_oidc_transaction`
INDEXED BY `system_sso_oidc_transaction_expiry_idx`
LIMIT 0;

SELECT
  `id`,
  `issuer`,
  `client_id`,
  `audience`,
  `allowed_tenant_id`,
  `redirect_uris_json`,
  `status`,
  `config_version`,
  `last_tested_at_utc`,
  `updated_by_user_id`,
  `create_time_utc`,
  `update_time_utc`
FROM `system_sso_connection`
LIMIT 0;

SELECT
  `id`,
  `issuer`,
  `authorization_base_url`,
  `audience`,
  `client_id`,
  `encrypted_client_secret`,
  `cloudflare_access_client_id`,
  `encrypted_cloudflare_access_client_secret`,
  `status`,
  `config_version`,
  `last_tested_at_utc`,
  `updated_by_user_id`,
  `create_time_utc`,
  `update_time_utc`
FROM `system_authorization_connection`
LIMIT 0;

SELECT `id`, `release_version`, `artifact_key`, `artifact_sha256`, `artifact_size`, `manifest_json`, `status`
FROM `admin_mobile_client_release`
LIMIT 0;
SELECT `id` FROM `admin_mobile_client_release` INDEXED BY `admin_mobile_client_release_version_unique` LIMIT 0;
SELECT `id` FROM `admin_mobile_client_release` INDEXED BY `admin_mobile_client_release_digest_unique` LIMIT 0;

SELECT `id`, `name`, `active_revision_id`, `is_enabled`
FROM `admin_mobile_client_environment`
LIMIT 0;
SELECT `id` FROM `admin_mobile_client_environment` INDEXED BY `admin_mobile_client_environment_name_unique` LIMIT 0;

SELECT `id`, `environment_id`, `revision`, `config_json`, `required_secret_keys_json`
FROM `admin_mobile_client_environment_revision`
LIMIT 0;
SELECT `id` FROM `admin_mobile_client_environment_revision` INDEXED BY `admin_mobile_client_env_revision_unique` LIMIT 0;

SELECT `id`, `deployment_id`, `client_id`, `active_client_id`, `release_version`, `release_digest`, `environment`, `environment_revision`, `activation_mode`, `phase`, `expires_at_utc`
FROM `admin_mobile_client_deployment`
LIMIT 0;
SELECT `id` FROM `admin_mobile_client_deployment` INDEXED BY `admin_mobile_client_deployment_id_unique` LIMIT 0;
SELECT `id` FROM `admin_mobile_client_deployment` INDEXED BY `admin_mobile_client_deployment_active_device_unique` LIMIT 0;
SELECT `source`, `is_enabled`, `is_primary`, `creator_id`, `create_time_utc`
FROM `base_webhook_config`
LIMIT 0;

-- enterprise-assets-contract-start
-- Read-only enterprise asset schema contract. Generated from the targeted Drizzle snapshot.

SELECT json(CASE WHEN
  (SELECT COUNT(*) FROM pragma_table_info('enterprise_asset_assignment')) = 13
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 1 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'tenant_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'asset_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'host_asset_id' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'location' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'valid_from_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'valid_to_utc' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'reason' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'close_reason' AND LOWER(type) = 'text' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'creator_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'updater_id' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'create_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_assignment') WHERE name = 'update_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_asset_assignment' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_asset_assignment_interval_checkCHECK(enterprise_asset_assignment.valid_from_utc>=0AND(enterprise_asset_assignment.valid_to_utcISNULLORenterprise_asset_assignment.valid_to_utc>enterprise_asset_assignment.valid_from_utc))') > 0)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_asset_assignment' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_asset_assignment_not_self_checkCHECK(enterprise_asset_assignment.host_asset_idISNULLORenterprise_asset_assignment.asset_id!=enterprise_asset_assignment.host_asset_id)') > 0)
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset_assignment') WHERE name = 'enterprise_asset_assignment_interval_idx' AND "unique" = 0 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_assignment_interval_idx')) = 3
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_assignment_interval_idx') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_assignment_interval_idx') WHERE seqno = 1 AND name = 'asset_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_assignment_interval_idx') WHERE seqno = 2 AND name = 'valid_from_utc')
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset_assignment') WHERE name = 'enterprise_asset_assignment_host_idx' AND "unique" = 0 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_assignment_host_idx')) = 3
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_assignment_host_idx') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_assignment_host_idx') WHERE seqno = 1 AND name = 'host_asset_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_assignment_host_idx') WHERE seqno = 2 AND name = 'valid_to_utc')
  AND (SELECT COUNT(*) FROM pragma_foreign_key_list('enterprise_asset_assignment')) = 4
  AND EXISTS (SELECT id FROM pragma_foreign_key_list('enterprise_asset_assignment') WHERE "table" = 'enterprise_asset' AND on_delete = 'NO ACTION' AND on_update = 'NO ACTION' AND ((seq = 0 AND "from" = 'tenant_id' AND "to" = 'tenant_id') OR (seq = 1 AND "from" = 'asset_id' AND "to" = 'id')) GROUP BY id HAVING COUNT(*) = 2)
  AND EXISTS (SELECT id FROM pragma_foreign_key_list('enterprise_asset_assignment') WHERE "table" = 'enterprise_asset' AND on_delete = 'NO ACTION' AND on_update = 'NO ACTION' AND ((seq = 0 AND "from" = 'tenant_id' AND "to" = 'tenant_id') OR (seq = 1 AND "from" = 'host_asset_id' AND "to" = 'id')) GROUP BY id HAVING COUNT(*) = 2)
THEN '{}' ELSE 'invalid enterprise_asset_assignment schema' END) AS enterprise_asset_assignment_contract;

SELECT json(CASE WHEN
  (SELECT COUNT(*) FROM pragma_table_info('enterprise_asset_identifier')) = 14
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 1 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'tenant_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'asset_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'identifier_type' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'namespace' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'value' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'normalized_value' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'source' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'confidence' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'is_verified' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'creator_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'updater_id' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'create_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_identifier') WHERE name = 'update_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_asset_identifier' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_asset_identifier_type_checkCHECK(enterprise_asset_identifier.identifier_typeIN(''sn'',''wwn'',''gpu_uuid'',''sid'',''other''))') > 0)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_asset_identifier' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_asset_identifier_confidence_checkCHECK(enterprise_asset_identifier.confidenceIN(''high'',''medium'',''low''))') > 0)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_asset_identifier' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_asset_identifier_verified_checkCHECK(enterprise_asset_identifier.is_verifiedIN(0,1))') > 0)
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset_identifier') WHERE name = 'enterprise_asset_identifier_verified_unique' AND "unique" = 1 AND partial = 1)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_identifier_verified_unique')) = 4
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_identifier_verified_unique') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_identifier_verified_unique') WHERE seqno = 1 AND name = 'identifier_type')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_identifier_verified_unique') WHERE seqno = 2 AND name = 'namespace')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_identifier_verified_unique') WHERE seqno = 3 AND name = 'normalized_value')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'enterprise_asset_identifier_verified_unique' AND SUBSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), -LENGTH('WHEREenterprise_asset_identifier.is_verified=1')) = 'WHEREenterprise_asset_identifier.is_verified=1')
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset_identifier') WHERE name = 'enterprise_asset_identifier_asset_idx' AND "unique" = 0 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_identifier_asset_idx')) = 2
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_identifier_asset_idx') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_identifier_asset_idx') WHERE seqno = 1 AND name = 'asset_id')
  AND (SELECT COUNT(*) FROM pragma_foreign_key_list('enterprise_asset_identifier')) = 2
  AND EXISTS (SELECT id FROM pragma_foreign_key_list('enterprise_asset_identifier') WHERE "table" = 'enterprise_asset' AND on_delete = 'NO ACTION' AND on_update = 'NO ACTION' AND ((seq = 0 AND "from" = 'tenant_id' AND "to" = 'tenant_id') OR (seq = 1 AND "from" = 'asset_id' AND "to" = 'id')) GROUP BY id HAVING COUNT(*) = 2)
THEN '{}' ELSE 'invalid enterprise_asset_identifier schema' END) AS enterprise_asset_identifier_contract;

SELECT json(CASE WHEN
  (SELECT COUNT(*) FROM pragma_table_info('enterprise_asset_measurement_binding')) = 16
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 1 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'tenant_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'asset_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'source_system' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'collector_id' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'device_id' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'metric' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'channel' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'valid_from_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'valid_to_utc' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'reason' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'close_reason' AND LOWER(type) = 'text' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'creator_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'updater_id' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'create_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset_measurement_binding') WHERE name = 'update_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_asset_measurement_binding' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_asset_binding_interval_checkCHECK(enterprise_asset_measurement_binding.valid_from_utc>=0AND(enterprise_asset_measurement_binding.valid_to_utcISNULLORenterprise_asset_measurement_binding.valid_to_utc>enterprise_asset_measurement_binding.valid_from_utc))') > 0)
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset_measurement_binding') WHERE name = 'enterprise_asset_binding_asset_idx' AND "unique" = 0 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_binding_asset_idx')) = 3
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_asset_idx') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_asset_idx') WHERE seqno = 1 AND name = 'asset_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_asset_idx') WHERE seqno = 2 AND name = 'valid_from_utc')
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset_measurement_binding') WHERE name = 'enterprise_asset_binding_source_idx' AND "unique" = 0 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_binding_source_idx')) = 7
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_source_idx') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_source_idx') WHERE seqno = 1 AND name = 'source_system')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_source_idx') WHERE seqno = 2 AND name = 'collector_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_source_idx') WHERE seqno = 3 AND name = 'device_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_source_idx') WHERE seqno = 4 AND name = 'metric')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_source_idx') WHERE seqno = 5 AND name = 'channel')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_binding_source_idx') WHERE seqno = 6 AND name = 'valid_from_utc')
  AND (SELECT COUNT(*) FROM pragma_foreign_key_list('enterprise_asset_measurement_binding')) = 2
  AND EXISTS (SELECT id FROM pragma_foreign_key_list('enterprise_asset_measurement_binding') WHERE "table" = 'enterprise_asset' AND on_delete = 'NO ACTION' AND on_update = 'NO ACTION' AND ((seq = 0 AND "from" = 'tenant_id' AND "to" = 'tenant_id') OR (seq = 1 AND "from" = 'asset_id' AND "to" = 'id')) GROUP BY id HAVING COUNT(*) = 2)
THEN '{}' ELSE 'invalid enterprise_asset_measurement_binding schema' END) AS enterprise_asset_measurement_binding_contract;

SELECT json(CASE WHEN
  (SELECT COUNT(*) FROM pragma_table_info('enterprise_asset')) = 16
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 1 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'tenant_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'asset_id' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'asset_code' AND LOWER(type) = 'text' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'name' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'category' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'brand' AND LOWER(type) = 'text' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'model' AND LOWER(type) = 'text' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'remark' AND LOWER(type) = 'text' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'status' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'retired_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'state_reason' AND LOWER(type) = 'text' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'creator_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'updater_id' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'create_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_asset') WHERE name = 'update_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_asset' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_asset_state_checkCHECK((enterprise_asset.status=''active''ANDenterprise_asset.retired_time_utcISNULL)OR(enterprise_asset.status=''retired''ANDenterprise_asset.retired_time_utcISNOTNULL))') > 0)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_asset' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_asset_category_checkCHECK(enterprise_asset.categoryIN(''host'',''disk'',''gpu'',''board'',''sensor'',''meter'',''other''))') > 0)
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset') WHERE name = 'enterprise_asset_public_id_unique' AND "unique" = 1 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_public_id_unique')) = 1
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_public_id_unique') WHERE seqno = 0 AND name = 'asset_id')
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset') WHERE name = 'enterprise_asset_tenant_id_unique' AND "unique" = 1 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_tenant_id_unique')) = 2
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_tenant_id_unique') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_tenant_id_unique') WHERE seqno = 1 AND name = 'id')
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset') WHERE name = 'enterprise_asset_tenant_code_unique' AND "unique" = 1 AND partial = 1)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_tenant_code_unique')) = 2
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_tenant_code_unique') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_tenant_code_unique') WHERE seqno = 1 AND name = 'asset_code')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'index' AND name = 'enterprise_asset_tenant_code_unique' AND SUBSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), -LENGTH('WHEREenterprise_asset.asset_codeISNOTNULL')) = 'WHEREenterprise_asset.asset_codeISNOTNULL')
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_asset') WHERE name = 'enterprise_asset_tenant_status_idx' AND "unique" = 0 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_asset_tenant_status_idx')) = 3
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_tenant_status_idx') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_tenant_status_idx') WHERE seqno = 1 AND name = 'status')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_asset_tenant_status_idx') WHERE seqno = 2 AND name = 'id')
  AND (SELECT COUNT(*) FROM pragma_foreign_key_list('enterprise_asset')) = 1
  AND EXISTS (SELECT id FROM pragma_foreign_key_list('enterprise_asset') WHERE "table" = 'enterprise_tenant' AND on_delete = 'NO ACTION' AND on_update = 'NO ACTION' AND ((seq = 0 AND "from" = 'tenant_id' AND "to" = 'id')) GROUP BY id HAVING COUNT(*) = 1)
THEN '{}' ELSE 'invalid enterprise_asset schema' END) AS enterprise_asset_contract;

SELECT json(CASE WHEN
  (SELECT COUNT(*) FROM pragma_table_info('enterprise_tenant_api_token_grant')) = 8
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_api_token_grant') WHERE name = 'id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 1 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_api_token_grant') WHERE name = 'tenant_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_api_token_grant') WHERE name = 'token_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_api_token_grant') WHERE name = 'is_enabled' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_api_token_grant') WHERE name = 'creator_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_api_token_grant') WHERE name = 'updater_id' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_api_token_grant') WHERE name = 'create_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_api_token_grant') WHERE name = 'update_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_tenant_api_token_grant' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_tenant_api_token_grant_enabled_checkCHECK(enterprise_tenant_api_token_grant.is_enabledIN(0,1))') > 0)
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_tenant_api_token_grant') WHERE name = 'enterprise_tenant_api_token_grant_token_unique' AND "unique" = 1 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_tenant_api_token_grant_token_unique')) = 1
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_tenant_api_token_grant_token_unique') WHERE seqno = 0 AND name = 'token_id')
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_tenant_api_token_grant') WHERE name = 'enterprise_tenant_api_token_grant_tenant_idx' AND "unique" = 0 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_tenant_api_token_grant_tenant_idx')) = 2
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_tenant_api_token_grant_tenant_idx') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_tenant_api_token_grant_tenant_idx') WHERE seqno = 1 AND name = 'is_enabled')
  AND (SELECT COUNT(*) FROM pragma_foreign_key_list('enterprise_tenant_api_token_grant')) = 1
  AND EXISTS (SELECT id FROM pragma_foreign_key_list('enterprise_tenant_api_token_grant') WHERE "table" = 'enterprise_tenant' AND on_delete = 'NO ACTION' AND on_update = 'NO ACTION' AND ((seq = 0 AND "from" = 'tenant_id' AND "to" = 'id')) GROUP BY id HAVING COUNT(*) = 1)
THEN '{}' ELSE 'invalid enterprise_tenant_api_token_grant schema' END) AS enterprise_tenant_api_token_grant_contract;

SELECT json(CASE WHEN
  (SELECT COUNT(*) FROM pragma_table_info('enterprise_tenant_member')) = 9
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_member') WHERE name = 'id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 1 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_member') WHERE name = 'tenant_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_member') WHERE name = 'user_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_member') WHERE name = 'role' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_member') WHERE name = 'is_enabled' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_member') WHERE name = 'creator_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_member') WHERE name = 'updater_id' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_member') WHERE name = 'create_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant_member') WHERE name = 'update_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_tenant_member' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_tenant_member_role_checkCHECK(enterprise_tenant_member.roleIN(''owner'',''admin'',''editor'',''viewer''))') > 0)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_tenant_member' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_tenant_member_enabled_checkCHECK(enterprise_tenant_member.is_enabledIN(0,1))') > 0)
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_tenant_member') WHERE name = 'enterprise_tenant_member_tenant_user_unique' AND "unique" = 1 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_tenant_member_tenant_user_unique')) = 2
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_tenant_member_tenant_user_unique') WHERE seqno = 0 AND name = 'tenant_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_tenant_member_tenant_user_unique') WHERE seqno = 1 AND name = 'user_id')
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_tenant_member') WHERE name = 'enterprise_tenant_member_user_idx' AND "unique" = 0 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_tenant_member_user_idx')) = 2
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_tenant_member_user_idx') WHERE seqno = 0 AND name = 'user_id')
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_tenant_member_user_idx') WHERE seqno = 1 AND name = 'is_enabled')
  AND (SELECT COUNT(*) FROM pragma_foreign_key_list('enterprise_tenant_member')) = 1
  AND EXISTS (SELECT id FROM pragma_foreign_key_list('enterprise_tenant_member') WHERE "table" = 'enterprise_tenant' AND on_delete = 'NO ACTION' AND on_update = 'NO ACTION' AND ((seq = 0 AND "from" = 'tenant_id' AND "to" = 'id')) GROUP BY id HAVING COUNT(*) = 1)
THEN '{}' ELSE 'invalid enterprise_tenant_member schema' END) AS enterprise_tenant_member_contract;

SELECT json(CASE WHEN
  (SELECT COUNT(*) FROM pragma_table_info('enterprise_tenant')) = 9
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant') WHERE name = 'id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 1 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant') WHERE name = 'key' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant') WHERE name = 'name' AND LOWER(type) = 'text' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant') WHERE name = 'is_enabled' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant') WHERE name = 'recovery_reason' AND LOWER(type) = 'text' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant') WHERE name = 'creator_id' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant') WHERE name = 'updater_id' AND LOWER(type) = 'integer' AND "notnull" = 0 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant') WHERE name = 'create_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM pragma_table_info('enterprise_tenant') WHERE name = 'update_time_utc' AND LOWER(type) = 'integer' AND "notnull" = 1 AND pk = 0 AND dflt_value IS NULL)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_tenant' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_tenant_enabled_checkCHECK(enterprise_tenant.is_enabledIN(0,1))') > 0)
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'enterprise_tenant' AND INSTR(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), '`', ''), 'CONSTRAINTenterprise_tenant_key_checkCHECK(length(enterprise_tenant.key)BETWEEN2AND64ANDenterprise_tenant.keyNOTGLOB''*[^a-z0-9_-]*'')') > 0)
  AND EXISTS (SELECT 1 FROM pragma_index_list('enterprise_tenant') WHERE name = 'enterprise_tenant_key_unique' AND "unique" = 1 AND partial = 0)
  AND (SELECT COUNT(*) FROM pragma_index_info('enterprise_tenant_key_unique')) = 1
  AND EXISTS (SELECT 1 FROM pragma_index_info('enterprise_tenant_key_unique') WHERE seqno = 0 AND name = 'key')
  AND (SELECT COUNT(*) FROM pragma_foreign_key_list('enterprise_tenant')) = 0
THEN '{}' ELSE 'invalid enterprise_tenant schema' END) AS enterprise_tenant_contract;
-- enterprise-assets-contract-end

-- cloudflare-usage-contract-start
-- Read-only Cloudflare usage schema contract, generated from the targeted Drizzle schema.

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='cloudflare_usage_daily' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), CHAR(96), ''))='createtablecloudflare_usage_daily(account_idtextnotnull,metric_idtextnotnull,day_utcintegernotnull,kindtextnotnull,sourcetextnotnull,valuetext,primarykey(account_id,metric_id,day_utc,kind))')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='cloudflare_usage_daily_retention_idx' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), CHAR(96), ''))='createindexcloudflare_usage_daily_retention_idxoncloudflare_usage_daily(account_id,day_utc)') THEN '{}' ELSE 'invalid cloudflare_usage_daily schema' END) AS cloudflare_usage_daily_contract;

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='cloudflare_usage_snapshot' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), CHAR(96), ''))='createtablecloudflare_usage_snapshot(account_idtextnotnull,sourcetextnotnull,payload_jsontextnotnull,collected_time_utcintegernotnull,primarykey(account_id,source))') THEN '{}' ELSE 'invalid cloudflare_usage_snapshot schema' END) AS cloudflare_usage_snapshot_contract;

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='cloudflare_usage_sync' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), CHAR(96), ''))='createtablecloudflare_usage_sync(account_idtextprimarykeynotnull,job_idtext,statetextnotnull,last_success_time_utcinteger,next_run_time_utcintegernotnull,retry_time_utcinteger,requested_time_utcintegernotnull,ownertext,generationintegernotnull,lease_expires_time_utcintegernotnull,cursor_jsontext,attemptsintegernotnull,coverage_jsontextnotnull)') THEN '{}' ELSE 'invalid cloudflare_usage_sync schema' END) AS cloudflare_usage_sync_contract;
-- cloudflare-usage-contract-end

-- personal-calendar-contract-start
-- Read-only personal calendar schema contract, generated from its targeted Drizzle schema.

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='personal_calendar_event' AND sql='CREATE TABLE `personal_calendar_event` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` integer NOT NULL,
	`request_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text,
	`start_time_utc` integer NOT NULL,
	`end_time_utc` integer,
	`time_zone` text NOT NULL,
	`reminder_time_utc` integer,
	`reminder_acknowledged_time_utc` integer,
	`status` text NOT NULL,
	`version` integer NOT NULL,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	CONSTRAINT "personal_calendar_event_status_check" CHECK("personal_calendar_event"."status" IN (''active'', ''cancelled'')),
	CONSTRAINT "personal_calendar_event_version_check" CHECK("personal_calendar_event"."version" >= 1),
	CONSTRAINT "personal_calendar_event_interval_check" CHECK("personal_calendar_event"."end_time_utc" IS NULL OR "personal_calendar_event"."end_time_utc" >= "personal_calendar_event"."start_time_utc"),
	CONSTRAINT "personal_calendar_event_reminder_check" CHECK("personal_calendar_event"."reminder_time_utc" IS NULL OR "personal_calendar_event"."reminder_time_utc" <= "personal_calendar_event"."start_time_utc")
)')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='personal_calendar_event_owner_request_unique' AND sql='CREATE UNIQUE INDEX `personal_calendar_event_owner_request_unique` ON `personal_calendar_event` (`owner_user_id`,`request_key`)')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='personal_calendar_event_owner_start_idx' AND sql='CREATE INDEX `personal_calendar_event_owner_start_idx` ON `personal_calendar_event` (`owner_user_id`,`start_time_utc`,`id`)')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='personal_calendar_event_owner_reminder_idx' AND sql='CREATE INDEX `personal_calendar_event_owner_reminder_idx` ON `personal_calendar_event` (`owner_user_id`,`reminder_time_utc`,`id`) WHERE "personal_calendar_event"."status" = ''active'' AND "personal_calendar_event"."reminder_acknowledged_time_utc" IS NULL AND "personal_calendar_event"."reminder_time_utc" IS NOT NULL')
  AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE tbl_name='personal_calendar_event' AND type='trigger')
  AND (SELECT count(*) FROM sqlite_master WHERE tbl_name='personal_calendar_event' AND type='index' AND sql IS NOT NULL)=3 THEN '{}' ELSE 'invalid personal_calendar_event schema' END) AS personal_calendar_event_contract;
-- personal-calendar-contract-end

-- personal-calendar-subscription-contract-start
-- Read-only personal calendar subscription schema contract, generated from its targeted Drizzle schema.

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='personal_calendar_subscription' AND sql='CREATE TABLE `personal_calendar_subscription` (
	`owner_user_id` integer PRIMARY KEY NOT NULL,
	`token_hash` text,
	`version` integer NOT NULL,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	CONSTRAINT "personal_calendar_subscription_owner_check" CHECK("personal_calendar_subscription"."owner_user_id" > 0),
	CONSTRAINT "personal_calendar_subscription_version_check" CHECK("personal_calendar_subscription"."version" >= 1),
	CONSTRAINT "personal_calendar_subscription_token_check" CHECK("personal_calendar_subscription"."token_hash" IS NULL OR (length("personal_calendar_subscription"."token_hash") = 64 AND "personal_calendar_subscription"."token_hash" NOT GLOB ''*[^0-9a-f]*''))
)')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='personal_calendar_subscription_token_unique' AND sql='CREATE UNIQUE INDEX `personal_calendar_subscription_token_unique` ON `personal_calendar_subscription` (`token_hash`)')
  AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE tbl_name='personal_calendar_subscription' AND type='trigger')
  AND (SELECT count(*) FROM sqlite_master WHERE tbl_name='personal_calendar_subscription' AND type='index' AND sql IS NOT NULL)=1 THEN '{}' ELSE 'invalid personal_calendar_subscription schema' END) AS personal_calendar_subscription_contract;
-- personal-calendar-subscription-contract-end
