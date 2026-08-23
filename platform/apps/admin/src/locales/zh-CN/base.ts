/** admin app — 底座 sys_config 页面文案 */
export const base = {
  'sidebar.menu.admin.base.config': '系统配置底座',
  'sidebar.menu.admin.base.webhookConfig': 'Webhook 配置',
  'admin.base.namespace': '命名空间',
  'admin.base.configKey': '配置键名',
  'admin.base.isPrimary': '主配置',
  'admin.base.configValue': '配置键值',
  'admin.base.webhookConfig.create': '新建 Webhook 配置',
  'admin.base.webhookConfig.edit': '编辑 Webhook 配置',
  'admin.base.webhookConfig.source': '来源',
  'admin.base.webhookConfig.url': 'Webhook 地址',
  'admin.base.webhookConfig.keywordPlaceholder': '搜索来源或备注',
  'admin.mqtt.config.testSuccess': 'MQTT 连通性测试成功',
  'admin.mqtt.config.testConnection': '测试连通性',
  'admin.mqtt.config.testing': '测试中...',
  'admin.mqtt.config.create': '新建 MQTT 配置',
  'admin.mqtt.config.edit': '编辑配置',
} as const satisfies Record<string, string>;
