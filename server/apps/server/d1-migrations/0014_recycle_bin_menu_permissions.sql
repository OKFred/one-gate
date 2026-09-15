-- Recycle bin metadata. Only the built-in superadmin role receives new actions.
INSERT INTO system_menu (
  id, name, icon, path, parent_id, sort, business, remark, is_enabled, creator_id
) VALUES (
  107, 'sidebar.menu.maintenance.recycleBin', 'material-symbols:restore-from-trash',
  '/admin/recycle-bin', 19, 7, 'admin.maintenance.recycle_bin', NULL, 1, 1
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name, icon = excluded.icon, path = excluded.path,
  parent_id = excluded.parent_id, sort = excluded.sort
WHERE system_menu.business = excluded.business;

-- Fail instead of overwriting an unrelated menu occupying the reserved seed ID.
CREATE TABLE __recycle_bin_menu_check (ok INTEGER NOT NULL CHECK (ok = 1));
INSERT INTO __recycle_bin_menu_check
SELECT CASE WHEN EXISTS (
  SELECT 1 FROM system_menu WHERE id = 107
    AND business = 'admin.maintenance.recycle_bin' AND path = '/admin/recycle-bin'
) THEN 1 ELSE 0 END;
DROP TABLE __recycle_bin_menu_check;

INSERT INTO system_permission (
  code, name, category, resource, business, remark, is_enabled, creator_id
) VALUES
  ('admin.maintenance.recycle_bin:read', 'Recycle bin - View', 'action', NULL, 'admin.maintenance.recycle_bin', NULL, 1, 1),
  ('admin.maintenance.recycle_bin:restore', 'Recycle bin - Restore', 'action', NULL, 'admin.maintenance.recycle_bin', NULL, 1, 1),
  ('admin.maintenance.recycle_bin:purge', 'Recycle bin - Permanently delete', 'action', NULL, 'admin.maintenance.recycle_bin', NULL, 1, 1)
ON CONFLICT(code) DO NOTHING;

INSERT INTO system_role_permission (role_id, permission_id, creator_id)
SELECT 1, p.id, 1 FROM system_permission p
WHERE p.code IN (
  'admin.maintenance.recycle_bin:read',
  'admin.maintenance.recycle_bin:restore',
  'admin.maintenance.recycle_bin:purge'
)
AND EXISTS (SELECT 1 FROM system_role WHERE id = 1)
AND NOT EXISTS (
  SELECT 1 FROM system_role_permission rp WHERE rp.role_id = 1 AND rp.permission_id = p.id
);

-- Generated backend messages from the module translation definitions.
INSERT INTO i18n_translation (application, business, lang_code, t_key, t_value, value_hash, remark, is_enabled, creator_id) VALUES
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.clockConflict', '部门更新时间晚于服务器时间，请检查时间后重试', '3b2f913dfcf235c9320d5097450c0e1c12f4df825dde849597ad769ef0ebe439', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.clockConflict', 'The department update time is ahead of server time; check the clock and try again', 'f7498d5a658d2d65a23fc0248a829c3f0a565e5766c1e013ff9a3c50ab3c04d8', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.notActive', '部门不存在或已删除', '4ba0b13d7d76a0bbc7bfa78e29d1367696e07f4f7c5c5f967e2b42387afbb626', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.notActive', 'Department does not exist or has been deleted', '47ddd8672c713ca2382acdd6e3976748adb43ab08f5dcbc2d164de304cc19740', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.hasReferences', '部门仍被子部门、用户或角色引用，请先解除引用', '6baff3116608e3e91360dfb04b197b4fe6d3efa58f1e28272ff01fc93a95317b', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.hasReferences', 'The department is still referenced by a child department, user, or role', 'a07e6c7fedafae541fcb7c7254aa2ba17e2ef500b6827cb81428e754e617fd51', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.invalidParent', '父部门不存在、已删除或层级无效，请先恢复父部门', '565855499a465e4042c308f458146dabe838e229c9f6d2ac05fd47a47abadffa', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.invalidParent', 'The parent department is missing, deleted, or invalid; restore the parent first', 'c44d2bc1689f3bfe3c6f1aacfd910eea91d937fa22a7c9e73e0a4b333cb02def', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.invalidDepartmentIds', '部门范围必须是正整数 ID 数组', '56e5876e51408ceeb3f202c357076aa2f97b3fc0599538f3e170456631a1e0a6', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.invalidDepartmentIds', 'Department scopes must be an array of positive integer IDs', '5581360a6f4d9f8d5293aad4a8a391869b342ab9a5b30705329809f4aaf943ce', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.referenceUnavailable', '关联部门不存在或已删除，请刷新后重试', '466fd2047acb02e7f4abfba3fdd9c0f8268072ea9f6f063d0ca173570f48299b', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.referenceUnavailable', 'A referenced department is missing or deleted; refresh and try again', 'e37e5092ef97f2d0fd102a1f0ae0e4d21e483f67f4c467d7b1a17b5e0eadde3e', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.nameConflict', '已存在同名部门，请先处理名称冲突', 'e474ffa723a764954b80867a06739dfca78e7f2856d9663ea8152694e8d50743', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.nameConflict', 'An active department already uses this name', '5e52711e2fcc0b7c1743df863ff151cc6efd9f891024c5b742b55f10b9eb419e', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.notDeleted', '回收站记录不存在或已恢复，请刷新列表', 'a22ef60743d63e2c027f75d50a4cea442572f6383269ede04082b5915cef3e68', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.notDeleted', 'The recycle-bin record is missing or already restored; refresh the list', 'f85e6e065118e8bab29d0cf6dce39f9a273e8260da0e71f082fd05ea454cbdbd', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.staleDeletion', '删除记录已发生变化，请刷新回收站后重试', '1b08b9b755c9a7523210954bb5df2ae77f20a327f25491af5f10c5bad4a5afb3', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.staleDeletion', 'This deletion has changed; refresh the recycle bin and try again', 'a5716e3a4f9dce48d791bf4a78586293e6e066f556f4871dc284cb59514f1c26', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.restoreExpired', '记录已满 30 天，无法恢复', '0e0a919d6e546082f7a32e2349da3f2859889da6d6f613ceee5c2af9c148baca', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.restoreExpired', 'The 30-day retention period has ended; this record cannot be restored', '598528feaf256007670b1302fdabef25396e8fcdce86b60a09027cc5b86fd6d7', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.stateConflict', '部门状态或关联关系已变化，请刷新后重试', '45a3f45ee99c7e7eba974c22ab4fa195d3a90183da10cda535379cf096bd8b0e', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.stateConflict', 'The department state or references changed; refresh and try again', '7157e9c06cd3b3b68d0f3c6cc85db5bc282f41e9ee0ec50ea32ffc7f0fa0d896', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.selfParent', '不能将部门自身设为父部门', '51e2081f28bf6f2e2adbba20d4e0f1574d2faaf91887a16720ffeb5b720a600d', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.selfParent', 'A department cannot be its own parent', '23dc60e637b209e5eb70111bc460cae04ea768ca7f75d76f3b72a16680e799d2', NULL, 1, 1),
('backend', 'admin.system.department', 'zh-CN', 'errorHandler.department.descendantParent', '不能将子孙部门设为父部门，会导致死循环', 'c0712f4536f0cff7d18ed506afe0455b5abf7969cc8ee2d73751317137639290', NULL, 1, 1),
('backend', 'admin.system.department', 'en-US', 'errorHandler.department.descendantParent', 'A descendant department cannot be set as a parent, it would cause a circular reference', 'cd0959866b49f4b9522cf2db35b687553d442b6fcabce88a7c8cb9d0e421131e', NULL, 1, 1),
('backend', 'admin.maintenance.recycle_bin', 'zh-CN', 'businessType.admin.maintenance.recycle_bin', '回收站', 'ba35dc23b245e61ec1f398934861c13d8cd1d4959c1a96a50cac9de17817c7ae', NULL, 1, 1),
('backend', 'admin.maintenance.recycle_bin', 'en-US', 'businessType.admin.maintenance.recycle_bin', 'Recycle bin', 'ac72175e6f752ba1f55dbef0533c8934658cb1e323f3f73b7dbf4d5589faee5e', NULL, 1, 1)
ON CONFLICT(t_key, lang_code) DO UPDATE SET t_value=excluded.t_value, value_hash=excluded.value_hash;
