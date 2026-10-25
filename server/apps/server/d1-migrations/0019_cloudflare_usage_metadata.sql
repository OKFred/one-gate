-- Add only this feature's permissions and backend translations. Existing role grants are preserved.
--> statement-breakpoint
INSERT INTO system_permission (code,name,category,resource,business,remark,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc) VALUES
( 'admin.maintenance.cloudflare_usage:read','Cloudflare usage and costs - Read','action',NULL,'admin.maintenance.cloudflare_usage',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
( 'admin.maintenance.cloudflare_usage:update','Cloudflare usage - Refresh','action',NULL,'admin.maintenance.cloudflare_usage',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL)
ON CONFLICT(code) DO NOTHING;
--> statement-breakpoint
INSERT INTO system_role_permission (role_id,permission_id,creator_id,updater_id,create_time_utc,update_time_utc) SELECT 1,p.id,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL FROM system_permission p WHERE p.code IN ('admin.maintenance.cloudflare_usage:read','admin.maintenance.cloudflare_usage:update') AND EXISTS (SELECT 1 FROM system_role WHERE id=1) AND NOT EXISTS (SELECT 1 FROM system_role_permission rp WHERE rp.role_id=1 AND rp.permission_id=p.id);
--> statement-breakpoint
UPDATE system_role SET permission_count=(SELECT COUNT(*) FROM system_role_permission WHERE role_id=1) WHERE id=1;
--> statement-breakpoint
INSERT INTO i18n_translation (application,business,lang_code,t_key,t_value,value_hash,remark,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc) VALUES
('backend','admin.maintenance.cloudflare_usage','zh-CN','businessType.admin.maintenance.cloudflare_usage','Cloudflare 用量','e33e84eb1f570a9aafe3e77b48f9883047d741ac7af9ffe84f4951b5b5058931',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.maintenance.cloudflare_usage','en-US','businessType.admin.maintenance.cloudflare_usage','Cloudflare usage','be239127e6a31fc79d37f5d8cf03c8c1cb2a0b53c75a23171d641dbfa4a6d6fe',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','zh-CN','errorHandler.ai.chat.modelChanged','模型配置已变更或不可用，请刷新模型列表后重试','ff65d7b60ba1cf677ab41c11c1e81b709b9908ccc74969bc9c471b6416b779b9',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','en-US','errorHandler.ai.chat.modelChanged','The model configuration changed or is unavailable. Refresh the model list and retry.','dd17b991c321ef3d860bfb415ee346f63c6256fbb891010a803bd1efe487d5c3',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','zh-CN','errorHandler.ai.chat.modelUnavailable','所选模型尚未配置完成，请选择可用模型','f9b990c2ed1e82ce7e32c086c95aae7ec884f857a4856a2fcca9c09268a58166',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','en-US','errorHandler.ai.chat.modelUnavailable','The selected model is not configured. Select an available model.','b0bfa0207576928855245a202bd211feda339a2aece537ff65999398d42d9b65',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','zh-CN','errorHandler.ai.chat.imageInvalid','图片必须是文件类型匹配的 PNG/JPEG Base64 data URI','42507b5664fb5cafb672defabd7abecbf9ae07f85c127c3a47219f809a2bc7b8',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','en-US','errorHandler.ai.chat.imageInvalid','Use a PNG/JPEG Base64 data URI whose file signature matches its type.','dc45505f29882b9dcd088cb62174409c702be419e74b9b568713816b73ae1f94',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','zh-CN','errorHandler.ai.chat.imageTooLarge','图片解码后不能超过 5 MiB','da92c288220d9c74c0931e102e14a6625d89761eacaf284ba1af346f8fd65205',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','en-US','errorHandler.ai.chat.imageTooLarge','The decoded image must not exceed 5 MiB.','8c8755abcee0a35f048f6470072aa14ef52a802a726aa8950512c45702cba454',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','zh-CN','errorHandler.ai.chat.imageLimit','当前问题和历史记录合计最多一张图片，换图请新建对话','d0d10e2eaaaeded3b01cc4d2df09fb8e90c93b5f66667ec4e3b11307115e5520',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','en-US','errorHandler.ai.chat.imageLimit','The question and history may contain one image in total. Start a new chat to change images.','7409052afb0d7a0e3790626b76cc153c3b3a379cbcf3f97a7264a706e7e03f54',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','zh-CN','errorHandler.ai.chat.imageUnsupported','所选模型不支持图片，请选择视觉模型','48530972651323343e095f415b2105e509637f78ce85eb91e4d2dbf8f6b84412',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','en-US','errorHandler.ai.chat.imageUnsupported','The selected model does not support images. Select a vision model.','f5cefa7a513372fc8a5b5013f999434e1ccdb05691317bf29e29494ea6c88992',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','zh-CN','errorHandler.ai.chat.upstreamError','所选模型请求失败，请稍后重试','dab0e7c5cfc07b6a0248ce5f687919ff7b548de9a951a60df4b513eb38936066',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','en-US','errorHandler.ai.chat.upstreamError','The selected model request failed. Retry later.','49daa50661203566ba8c9367dd6f1cd0f76fb7371b487cdd37beef6d909c43e7',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','zh-CN','errorHandler.ai.chat.upstreamInvalid','所选模型未返回有效回答，请稍后重试','c659b9db94f40161070598c83839b7535fa6dc349a8b1bcadbc2d719f3061279',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL),
('backend','admin.ai.chat','en-US','errorHandler.ai.chat.upstreamInvalid','The selected model returned no valid answer. Retry later.','2b34401169c83830fe3559789b2c473ed09e928899e0c9edafafd3c9df170eae',NULL,1,1,NULL,CAST(unixepoch('subsec') * 1000 AS INTEGER),NULL)
ON CONFLICT(t_key,lang_code) DO UPDATE SET t_value=excluded.t_value,value_hash=excluded.value_hash;
