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
