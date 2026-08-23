INSERT OR IGNORE INTO `system_menu` (
  `id`, `name`, `icon`, `path`, `parent_id`, `sort`, `business`,
  `remark`, `is_enabled`, `creator_id`
)
VALUES (
  106,
  'sidebar.menu.admin.base.webhookConfig',
  'material-symbols:webhook',
  '/admin/base/webhook_config',
  49,
  3,
  'admin.base.webhook_config',
  NULL,
  1,
  1
);

INSERT OR IGNORE INTO `system_permission` (
  `code`, `name`, `category`, `resource`, `business`, `remark`,
  `is_enabled`, `creator_id`
)
VALUES
  ('admin.base.webhook_config:read', 'admin.base.webhook_config:read-View', 'action', NULL, 'admin.base.webhook_config', NULL, 1, 1),
  ('admin.base.webhook_config:add', 'admin.base.webhook_config:add-Add', 'action', NULL, 'admin.base.webhook_config', NULL, 1, 1),
  ('admin.base.webhook_config:edit', 'admin.base.webhook_config:edit-Edit', 'action', NULL, 'admin.base.webhook_config', NULL, 1, 1),
  ('admin.base.webhook_config:delete', 'admin.base.webhook_config:delete-Delete', 'action', NULL, 'admin.base.webhook_config', NULL, 1, 1);
