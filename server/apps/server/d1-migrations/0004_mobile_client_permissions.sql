INSERT OR IGNORE INTO system_permission (
  code,
  name,
  category,
  resource,
  business,
  remark,
  is_enabled,
  creator_id
)
VALUES
  ('admin.mobile.client_release:read', 'AutoJS6 client release-read', 'action', NULL, 'admin.mobile.client_release', NULL, 1, 1),
  ('admin.mobile.client_release:dispatch', 'AutoJS6 client release-dispatch', 'action', NULL, 'admin.mobile.client_release', NULL, 1, 1),
  ('admin.mobile.client_environment:read', 'AutoJS6 client environment-read', 'action', NULL, 'admin.mobile.client_environment', NULL, 1, 1),
  ('admin.mobile.client_environment:dispatch', 'AutoJS6 client environment-dispatch', 'action', NULL, 'admin.mobile.client_environment', NULL, 1, 1),
  ('admin.mobile.client_deployment:read', 'AutoJS6 client deployment-read', 'action', NULL, 'admin.mobile.client_deployment', NULL, 1, 1),
  ('admin.mobile.client_deployment:dispatch', 'AutoJS6 client deployment-dispatch', 'action', NULL, 'admin.mobile.client_deployment', NULL, 1, 1);
