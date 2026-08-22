CREATE TABLE IF NOT EXISTS `admin_mobile_network_routing` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `client_id` text NOT NULL,
  `active_task_client_id` text,
  `policy_revision` integer NOT NULL,
  `generation` integer NOT NULL,
  `lan_cidrs_json` text NOT NULL,
  `lan_probe_urls_json` text NOT NULL,
  `internet_probe_url` text NOT NULL,
  `probe_timeout_ms` integer NOT NULL,
  `desired_target` text,
  `actual_target` text,
  `state` text NOT NULL,
  `last_task_id` text,
  `last_error_code` text,
  `last_result_json` text,
  `last_verified_time_utc` integer,
  `creator_id` integer NOT NULL,
  `updater_id` integer,
  `create_time_utc` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `update_time_utc` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `admin_mobile_network_routing_client_unique`
  ON `admin_mobile_network_routing` (`client_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `admin_mobile_network_routing_active_task_unique`
  ON `admin_mobile_network_routing` (`active_task_client_id`);
CREATE INDEX IF NOT EXISTS `admin_mobile_network_routing_state_idx`
  ON `admin_mobile_network_routing` (`state`);

INSERT OR IGNORE INTO system_permission (
  code, name, category, resource, business, remark, is_enabled, creator_id
) VALUES
  ('admin.mobile.network_routing:read', '读取设备网络分流', 'mobile', 'network-routing', 'admin.mobile.network_routing', '读取每设备网络分流配置和状态', 1, 0),
  ('admin.mobile.network_routing:edit', '管理设备网络分流', 'mobile', 'network-routing', 'admin.mobile.network_routing', '修改、应用和停用每设备网络分流', 1, 0);
