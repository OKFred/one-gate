/** admin app — Base sys_config page text */
export const base = {
  'sidebar.menu.admin.base.config': 'Base SysConfig',
  'sidebar.menu.admin.base.webhookConfig': 'Webhook Config',
  'admin.base.namespace': 'Namespace',
  'admin.base.configKey': 'Config Key',
  'admin.base.isPrimary': 'Is Primary',
  'admin.base.configValue': 'Config Value',
  'admin.base.webhookConfig.create': 'New Webhook Config',
  'admin.base.webhookConfig.edit': 'Edit Webhook Config',
  'admin.base.webhookConfig.source': 'Source',
  'admin.base.webhookConfig.url': 'Webhook URL',
  'admin.base.webhookConfig.keywordPlaceholder': 'Search source or remark',
  'admin.mqtt.config.testSuccess': 'MQTT connection test successful',
  'admin.mqtt.config.testConnection': 'Test Connection',
  'admin.mqtt.config.testing': 'Testing...',
  'admin.mqtt.config.create': 'New MQTT Config',
  'admin.mqtt.config.edit': 'Edit Config',
} as const satisfies Record<string, string>;
