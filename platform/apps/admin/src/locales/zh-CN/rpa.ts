/** admin app — RPA 配置页面文案 */
export const rpa = {
  'sidebar.menu.admin.rpa.config': 'RPA配置',
  'admin.rpa.config.verifySuccess': 'CDP RPA配置连通性验证成功！',
  'admin.rpa.config.verifyFailed': '验证失败，请确认 CDP WebSocket 服务是否正常开启。',
  'admin.rpa.config.name': '配置名称',
  'admin.rpa.config.cdpUrlLabel': 'CDP 调试地址',
  'admin.rpa.config.defaultEnv': '默认环境',
  'admin.rpa.config.yes': '是',
  'admin.rpa.config.no': '否',
  'admin.rpa.config.status': '状态',
  'admin.rpa.config.enabled': '启用',
  'admin.rpa.config.disabled': '禁用',
  'admin.rpa.config.cdpUrlCardLabel': 'CDP 地址',
  'admin.rpa.config.default': '默认',
  'admin.rpa.config.testConnection': '测试连接',
  'admin.rpa.config.verifyError': '连通性验证请求出错，请重试。',
  'admin.rpa.config.cdpUrlFormLabel': 'CDP 连接地址 (ws:// 或 host:port)',
  'admin.rpa.config.cdpUrlHelper':
    '自托管示例: 127.0.0.1:9222；Cloudflare 模式格式: https://api.cloudflare.com/client/v4/accounts/<您的ACCOUNT_ID>/browser-rendering',
  'admin.rpa.config.setDefaultEnv': '设为默认环境 (设置为默认后将自动取消其他环境的默认标识)',
  'admin.rpa.config.enableEnv': '启用环境',
  'admin.rpa.config.remark': '备注',
  'admin.rpa.config.authToken': '认证 Token',
  'admin.rpa.config.authTokenHelper':
    '认证 Token（可选）。填写后自动切换为 Cloudflare Browser Run 模式，使用 Bearer Token 进行身份验证',
} as const satisfies Record<string, string>;
