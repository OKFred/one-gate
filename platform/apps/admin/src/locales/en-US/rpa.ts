export const rpa = {
  'sidebar.menu.admin.rpa.config': 'Browser Configuration',
  'admin.rpa.config.verifySuccess': 'CDP connection verified successfully!',
  'admin.rpa.config.verifyFailed':
    'Verification failed. Please verify that the CDP WebSocket service is active.',
  'admin.rpa.config.name': 'Configuration Name',
  'admin.rpa.config.cdpUrlLabel': 'CDP Debug Address',
  'admin.rpa.config.defaultEnv': 'Default Environment',
  'admin.rpa.config.yes': 'Yes',
  'admin.rpa.config.no': 'No',
  'admin.rpa.config.status': 'Status',
  'admin.rpa.config.enabled': 'Enabled',
  'admin.rpa.config.disabled': 'Disabled',
  'admin.rpa.config.cdpUrlCardLabel': 'CDP Address',
  'admin.rpa.config.default': 'Default',
  'admin.rpa.config.testConnection': 'Test Connection',
  'admin.rpa.config.verifyError': 'Connection verification request failed, please try again.',
  'admin.rpa.config.cdpUrlFormLabel': 'CDP Connection Address (ws:// or host:port)',
  'admin.rpa.config.cdpUrlHelper':
    'Self-hosted e.g.: 127.0.0.1:9222; Cloudflare format: https://api.cloudflare.com/client/v4/accounts/<YOUR_ACCOUNT_ID>/browser-rendering',
  'admin.rpa.config.setDefaultEnv':
    'Set as Default Environment (setting as default will automatically cancel other default flags)',
  'admin.rpa.config.enableEnv': 'Enable Environment',
  'admin.rpa.config.remark': 'Remark',
  'admin.rpa.config.authToken': 'Authentication Token',
  'admin.rpa.config.authTokenHelper':
    'Authentication Token (Optional). Specifying this will automatically switch to Cloudflare Browser Run mode, using the Bearer Token for authentication.',
} as const satisfies Record<string, string>;
