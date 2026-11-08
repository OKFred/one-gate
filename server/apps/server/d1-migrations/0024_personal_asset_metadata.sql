-- Additive personal asset UI metadata; existing data and role grants are preserved.

SELECT json(CASE WHEN NOT EXISTS (SELECT 1 FROM system_menu WHERE id=81 AND (name<>'sidebar.menu.personal.asset' OR business IS NOT 'personal.asset')) THEN '{}' ELSE 'personal asset menu id collision' END);

INSERT INTO system_menu(id,name,icon,path,parent_id,sort,business,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc) VALUES (81,'sidebar.menu.personal.asset','material-symbols:home-work-outline','/personal/asset',47,0,'personal.asset',1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL) ON CONFLICT(id) DO NOTHING;

INSERT INTO system_permission(code,name,category,resource,business,remark,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc) VALUES
('personal.asset:read','Personal assets - Read','action',NULL,'personal.asset',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('personal.asset:update','Personal assets - Place','action',NULL,'personal.asset',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL)
ON CONFLICT(code) DO NOTHING;

INSERT INTO system_role_permission(role_id,permission_id,creator_id,updater_id,create_time_utc,update_time_utc) SELECT 1,p.id,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL FROM system_permission p WHERE p.code IN ('personal.asset:read','personal.asset:update') AND EXISTS(SELECT 1 FROM system_role WHERE id=1) AND NOT EXISTS(SELECT 1 FROM system_role_permission rp WHERE rp.role_id=1 AND rp.permission_id=p.id);
UPDATE system_role SET permission_count=(SELECT COUNT(*) FROM system_role_permission WHERE role_id=1) WHERE id=1;

INSERT INTO i18n_translation(application,business,lang_code,t_key,t_value,value_hash,remark,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc) VALUES
('backend','personal.asset','zh-CN','businessType.personal.asset','个人资产空间','e3f654ecedeee1ef1271a6f376e2b1f36e83f4e20c6dc0fbe4570a9be8dd9bdd',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','personal.asset','en-US','businessType.personal.asset','Personal asset spaces','059584d684b3d7181d9df401c32825260c5f4ee04ed740ad02183a9469aedece',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','personal.asset','zh-CN','errorHandler.personal.asset.invalidPlacement','请选择有效的区域和楼层','bd486aaec887be7324496e70f0f1b1804417ca528f88d9357829d995ba81e2be',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','personal.asset','en-US','errorHandler.personal.asset.invalidPlacement','Select a valid site and floor','d5ed92616b4f85ba34735ce168f1bd43e4a60c0633716f7e756c481e74c3b0c4',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','personal.asset','zh-CN','errorHandler.personal.asset.stateConflict','展示位置已变更，请刷新后重试','fc01797ff26fabc5c4e275994beb572461e8f6aa05a8d278ab9819c62df166d1',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','personal.asset','en-US','errorHandler.personal.asset.stateConflict','The placement changed. Refresh before trying again.','f708a6c2eb132a32e89da737aa721f6c7ebd989062685ac260fca59510aae42b',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','personal.asset','zh-CN','errorHandler.personal.asset.tooManyAssets','当前企业超过 1000 项资产，无法完整展示；未返回部分清单','0984728fbedfeea428150cad9dc22893bddc8e35b0c2339a628ddc04fc24f49d',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','personal.asset','en-US','errorHandler.personal.asset.tooManyAssets','This enterprise has more than 1,000 assets. No partial list was returned.','87db329c0bf884b78232c1aced8c38cc1ae874c93f07d5d10c2515ce4825c140',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL)
ON CONFLICT(t_key,lang_code) DO UPDATE SET t_value=excluded.t_value,value_hash=excluded.value_hash;
