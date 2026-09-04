/**
 * 登录、注销、密码修改等认证相关文案
 */
export const auth = {
  // 顶栏
  'topbar.title': '条条大道通罗马',
  'topbar.profile': '个人设置',
  'topbar.logout': '退出登录',
  'topbar.notLoggedIn': '未登录',

  // 登录页
  'login.username': '用户名',
  'login.password': '密码',
  'login.signIn': '登录',
  'login.title': 'Open The Gate',
  'login.subtitle': '通用企业级权限管理后台',
  'auth.errorCode': '错误码',
  'auth.requestId': '请求编号',

  // one-sso
  'sso.signIn': '使用统一身份中心登录',
  'sso.bind': '绑定统一身份中心',
  'sso.unbind': '解绑统一身份中心',
  'sso.bound': '已绑定统一身份中心',
  'sso.bindingTenant': '租户：{{tenant}}',
  'sso.unbindTitle': '确认解绑统一身份中心？',
  'sso.unbindConfirm': '解绑后将无法继续使用统一身份中心登录，确定继续吗？',
  'sso.confirmUnbind': '确定解绑',
  'sso.unbindSuccess': '统一身份中心解绑成功',
  'sso.bindSuccess': '统一身份中心绑定成功',
  'sso.loginSuccess': '统一身份中心登录成功',
  'sso.authFailed': '统一身份中心授权失败',
  'sso.authFailedRetry': '授权失败，请返回后重试',
  'sso.missingCallbackParameters': '未找到授权码或安全状态，请重新发起授权。',
  'sso.verifying': '正在验证统一身份中心授权，请稍候...',
  'sso.back': '返回',

  // Authenticator / 2FAS 二次门禁
  'totpGate.title': '二次安全验证',
  'totpGate.description': '请输入 Microsoft Authenticator 或 2FAS 中当前显示的 6 位动态验证码。',
  'totpGate.code': '动态验证码',
  'totpGate.verify': '验证并进入系统',
  'totpGate.sixDigitRequired': '请输入 6 位数字验证码',

  // 个人中心 / 我的
  'me.title': '我的',
  'me.subtitle': '个人信息',
  'me.region': '国家/地区',
  'me.department': '部门',
  'me.role': '角色',
  'me.accountStatus': '账户状态',
  'me.changePassword.title': '修改密码',
  'me.changePassword.confirmPasswordRequired': '确认密码必填',
  'me.changePassword.passwordFormatHint': '密码长度7位~30位，至少包含一个字母和一个数字',
  'me.changePassword.sameAsOldPassword': '新密码不能与当前密码相同',
  'me.changePassword.passwordMismatch': '新密码与确认密码不匹配',
  'me.changePassword.success': '密码修改成功',
  'me.table.currentPassword': '当前密码',
  'me.table.newPassword': '新密码',
  'me.table.confirmPassword': '确认新密码',

  // 日志相关（通用审计日志组件）
  'log.namespace': '命名空间',
  'log.logLevel': '日志级别',
  'log.payloadType': '数据格式',
  'log.beforeData': '变更前数据',
  'log.afterData': '变更后数据',
  'log.content': '内容',
  'log.sysLog': '系统日志',
  'log.auditLog': '审计日志',
  'log.bizLog': '业务日志',
  'log.httpLog': 'HTTP请求日志',
  'log.globalTimeline': '全局时间线',
  'log.method': '请求方式',
  'log.protocol': '协议',
  'log.url': '请求地址',
  'log.status': '状态码',
  'log.duration': '耗时',
  'log.allMethod': '全部请求方式',
  'log.allProtocol': '全部协议',
} as const satisfies Record<string, string>;
