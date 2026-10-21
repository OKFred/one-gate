-- Enterprise asset navigation, RBAC and generated backend messages. Preserve unrelated metadata.
INSERT INTO system_menu (id,name,icon,path,parent_id,sort,business,remark,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc)
VALUES (108,'sidebar.menu.enterprise.tenant','material-symbols:domain','/enterprise/tenant',26,2,'enterprise.tenant',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL)
ON CONFLICT(id) DO UPDATE SET name=excluded.name,icon=excluded.icon,path=excluded.path,parent_id=excluded.parent_id,sort=excluded.sort
WHERE system_menu.business=excluded.business;
--> statement-breakpoint
SELECT json(CASE WHEN EXISTS (SELECT 1 FROM system_menu WHERE id=108 AND business='enterprise.tenant' AND path='/enterprise/tenant') THEN '{}' ELSE 'enterprise menu seed conflict' END);
--> statement-breakpoint
INSERT INTO system_menu (id,name,icon,path,parent_id,sort,business,remark,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc)
VALUES (109,'sidebar.menu.enterprise.asset','material-symbols:inventory-2','/enterprise/asset',26,3,'enterprise.asset',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL)
ON CONFLICT(id) DO UPDATE SET name=excluded.name,icon=excluded.icon,path=excluded.path,parent_id=excluded.parent_id,sort=excluded.sort
WHERE system_menu.business=excluded.business;
--> statement-breakpoint
SELECT json(CASE WHEN EXISTS (SELECT 1 FROM system_menu WHERE id=109 AND business='enterprise.asset' AND path='/enterprise/asset') THEN '{}' ELSE 'enterprise menu seed conflict' END);
--> statement-breakpoint
INSERT INTO system_permission (code,name,category,resource,business,remark,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc) VALUES
('enterprise.tenant:read','enterprise.tenant:read','action',NULL,'enterprise.tenant',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('enterprise.tenant:add','enterprise.tenant:add','action',NULL,'enterprise.tenant',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('enterprise.tenant:edit','enterprise.tenant:edit','action',NULL,'enterprise.tenant',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('enterprise.asset:read','enterprise.asset:read','action',NULL,'enterprise.asset',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('enterprise.asset:add','enterprise.asset:add','action',NULL,'enterprise.asset',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('enterprise.asset:edit','enterprise.asset:edit','action',NULL,'enterprise.asset',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('enterprise.asset.mapping:read','enterprise.asset.mapping:read','action',NULL,'enterprise.asset.mapping',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL)
ON CONFLICT(code) DO NOTHING;
--> statement-breakpoint
INSERT INTO system_role_permission (role_id,permission_id,creator_id,updater_id,create_time_utc,update_time_utc)
SELECT 1,p.id,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL FROM system_permission p WHERE p.code IN ('enterprise.tenant:read','enterprise.tenant:add','enterprise.tenant:edit','enterprise.asset:read','enterprise.asset:add','enterprise.asset:edit','enterprise.asset.mapping:read')
AND EXISTS (SELECT 1 FROM system_role WHERE id=1)
AND NOT EXISTS (SELECT 1 FROM system_role_permission rp WHERE rp.role_id=1 AND rp.permission_id=p.id);
--> statement-breakpoint
INSERT INTO i18n_translation (application,business,lang_code,t_key,t_value,value_hash,remark,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc) VALUES
('backend','enterprise.tenant','zh-CN','errorHandler.enterprise.tenant.notVisible','企业或记录不可用，或你无权访问',
/* Translation SHA-256 */ 'e2e10d2e90a8e12c6e5b8c03a714928688600d1d6b08e9a958ddf42ee1124cde',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','en-US','errorHandler.enterprise.tenant.notVisible','The enterprise or record is unavailable or not accessible',
/* Translation SHA-256 */ '4bfb3637ffb0e80cb886763fada7cb1f0ff757734edef85e68f25f74305a9a23',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','zh-CN','errorHandler.enterprise.tenant.stateConflict','企业状态、成员权限或版本已变化；不能移除最后一名有效所有者，请刷新后重试',
/* Translation SHA-256 */ '9c6c8d6dbbc488322f9c325acfb6282034589492ff345b9cf1006c521e5a4952',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','en-US','errorHandler.enterprise.tenant.stateConflict','Enterprise state, membership or version changed; the last active owner cannot be removed. Refresh before retrying',
/* Translation SHA-256 */ '2611b0e0b1ac559dbc320ca05f3074438700a373b51a27eb76b5da428d355557',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','zh-CN','errorHandler.enterprise.tenant.keyConflict','企业标识已被使用，不能复用',
/* Translation SHA-256 */ 'c4c351e1dc07b02ea5146046cdccef540cdc7f6b3a94628e6d9b890e9ea4243c',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','en-US','errorHandler.enterprise.tenant.keyConflict','The enterprise key is already in use and cannot be reused',
/* Translation SHA-256 */ '528f7f5b2c96f7733831b9b9e5c853830d9b682db70103934505d4f4f150108c',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','zh-CN','errorHandler.enterprise.tenant.humanRequired','此操作仅允许用户身份执行，机器令牌不可使用',
/* Translation SHA-256 */ '41c970d569e043c142a39329be62ecbe9fd0d8c5de0760ac2d61a2eb8beed39b',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','en-US','errorHandler.enterprise.tenant.humanRequired','This operation requires a user identity and is not available to machine tokens',
/* Translation SHA-256 */ '9fadf72eb3952f562ab1b1e416083f1d0a0dd35140ab9f4a7ec32aa04331417b',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','zh-CN','errorHandler.enterprise.tenant.platformRequired','此操作仅允许当前平台超级管理员执行',
/* Translation SHA-256 */ '247110e5c83364820fc34d707b392baa73c138bdd1317f3d2abdd554e28018c5',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','en-US','errorHandler.enterprise.tenant.platformRequired','This operation requires the current platform super administrator',
/* Translation SHA-256 */ '01f654416d5ea4b45eb9c6e840a81efa2f883d580fa6fa7c73bd740a7491b518',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','zh-CN','errorHandler.enterprise.tenant.ownerRequired','此操作需要本企业所有者权限',
/* Translation SHA-256 */ 'e6a8d2ab0d5b21f4ec665416cc00ddf27e66802f3a2d357252b22aa14388a429',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','en-US','errorHandler.enterprise.tenant.ownerRequired','This operation requires an owner of this enterprise',
/* Translation SHA-256 */ '9c1d50cc191186342ea8253ea6336c3b4af538096716a69c2de941ff448cca2a',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','zh-CN','errorHandler.enterprise.tenant.tokenUnavailable','令牌不可用、无映射读取权限或不属于你',
/* Translation SHA-256 */ '08798adffd56cef7dcac1e10611fdf61250aa3d64a9ed534eb010c6204edc6e0',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','en-US','errorHandler.enterprise.tenant.tokenUnavailable','The token is unavailable, lacks mapping-read permission, or is not owned by you',
/* Translation SHA-256 */ 'cbc3c136dd6cef31e8f610c4903fed04f653e1a85081948d42c07ebb0bf6b01d',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','zh-CN','errorHandler.enterprise.tenant.userUnavailable','目标用户不存在或已停用',
/* Translation SHA-256 */ 'f473efd97ef356edf43702b8535aaedc3c3451e5ca5ee91bd2e1f1025b6591ea',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.tenant','en-US','errorHandler.enterprise.tenant.userUnavailable','The target user is missing or disabled',
/* Translation SHA-256 */ '13c31c6f225c697fcd723c03f43bf0b60670147634e0be7da6ea86c8e580cb6a',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','zh-CN','errorHandler.enterprise.asset.notVisible','资产不存在或无权访问',
/* Translation SHA-256 */ '93c2994ee7f86ef2b3e7687acd384b7ad5c324c72971b01ba049bba61b65726b',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','en-US','errorHandler.enterprise.asset.notVisible','The asset is unavailable',
/* Translation SHA-256 */ '12b0a2b7ed1918a85c782b9930be00f960f4e18f09d0b62f9eea03eddb807c09',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','zh-CN','errorHandler.enterprise.asset.stateConflict','资产或关联状态已变化，或关系存在冲突，请刷新查看',
/* Translation SHA-256 */ 'f42cb11f1302cf901a93de6b24e9937d567fde775757e68d0d578deeebbd07b3',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','en-US','errorHandler.enterprise.asset.stateConflict','The asset or relation changed or conflicts with an existing relation. Refresh and try again',
/* Translation SHA-256 */ '0a6ace1f031706816aed154bc3a45a8bd1ba920d70e5db462bb8446be0400e43',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','zh-CN','errorHandler.enterprise.asset.codeConflict','本企业的资产编号已被使用',
/* Translation SHA-256 */ '099e6dd0b9e1b8f464a3e52ce03a6204d94628f4272a68b198a6e555f5ff0e7d',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','en-US','errorHandler.enterprise.asset.codeConflict','This asset code is already used in the enterprise',
/* Translation SHA-256 */ 'a6e324d80da754e7fa3e4930a41f8340c83a19da568f75cb051d89cfea3cf7d9',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','zh-CN','errorHandler.enterprise.asset.identifierConflict','本企业已存在相同的已核验资产标识',
/* Translation SHA-256 */ '50e19827980783512edd76fb4695dd28402113ee01d9008ad58771b8892294e7',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','en-US','errorHandler.enterprise.asset.identifierConflict','This verified identifier already exists in the enterprise',
/* Translation SHA-256 */ '22bd7fa8027a64cc8566d7b12b061c37d84968bf5e6f311b8f340c319b2177ad',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','zh-CN','errorHandler.enterprise.asset.invalidIdentifier','资产标识无效，不能使用占位值，核验标识需填写命名空间',
/* Translation SHA-256 */ '6672e9fe36a98de198882803901037fc342840a778d358de7cc8476c8052bf8d',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','en-US','errorHandler.enterprise.asset.invalidIdentifier','The identifier is invalid. Placeholders are not accepted; verified identifiers need a namespace',
/* Translation SHA-256 */ 'c9c990c90ec1b5c9737c5b389bfcf1a35624d1b5fbdb68ce041060cf8c0d986d',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','zh-CN','errorHandler.enterprise.asset.invalidInterval','有效区间无效，结束时间必须晚于开始时间',
/* Translation SHA-256 */ '68d07e589787b155f4ce4c067e37668dc6acacc8dd87dff8ec48510ddfa1366c',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','en-US','errorHandler.enterprise.asset.invalidInterval','The interval is invalid. Its end must be later than its start',
/* Translation SHA-256 */ 'bdc93dfb2735a68535ce1c0f89c33b484747635be83e9857cc31c88ec5477701',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','zh-CN','errorHandler.enterprise.asset.ambiguousMapping','观测时间存在多个资产映射，请修复冲突后重试',
/* Translation SHA-256 */ '3a74a236410cb49594897b5f08754696d71426bbc8c39477cc1e6fb437b349b5',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','enterprise.asset','en-US','errorHandler.enterprise.asset.ambiguousMapping','More than one asset mapping covers this observation. Resolve the conflict first',
/* Translation SHA-256 */ '077051fd2f1afaaa509289bd674a30806b81cb9dc8cdb3331c1711826843feec',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL)
ON CONFLICT(t_key,lang_code) DO UPDATE SET t_value=excluded.t_value,value_hash=excluded.value_hash;
