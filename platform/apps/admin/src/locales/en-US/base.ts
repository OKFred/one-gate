/** admin app — Base sys_config page text */
export const base = {
  'sidebar.menu.admin.base.config': 'Base SysConfig',
  'admin.base.namespace': 'Namespace',
  'admin.base.configKey': 'Config Key',
  'admin.base.isPrimary': 'Is Primary',
  'admin.base.configValue': 'Config Value',
  'admin.mqtt.config.testSuccess': 'MQTT connection test successful',
  'admin.mqtt.config.testConnection': 'Test Connection',
  'admin.mqtt.config.testing': 'Testing...',
  'admin.mqtt.config.create': 'New MQTT Config',
  'admin.mqtt.config.edit': 'Edit Config',
} as const satisfies Record<string, string>;
