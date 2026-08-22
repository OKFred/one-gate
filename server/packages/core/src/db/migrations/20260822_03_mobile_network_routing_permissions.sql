INSERT OR IGNORE INTO system_permission (
  code, name, category, resource, business, remark, is_enabled, creator_id
) VALUES
  ('admin.mobile.network_routing:read', '读取设备网络分流', 'mobile', 'network-routing', 'admin.mobile.network_routing', '读取每设备网络分流配置和状态', 1, 0),
  ('admin.mobile.network_routing:edit', '管理设备网络分流', 'mobile', 'network-routing', 'admin.mobile.network_routing', '修改、应用和停用每设备网络分流', 1, 0);
