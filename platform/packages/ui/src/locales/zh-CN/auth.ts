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
  'login.wechatSignIn': '微信登录',
  'login.wechatWIP': '微信登录功能正在开发中...',
  'login.forgotPassword': '忘记密码？',
  'login.title': 'Open The Gate',
  'login.subtitle': '通用企业级权限管理后台',

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
  'log.sysLog': '系统日志 (Sys)',
  'log.auditLog': '审计日志 (Audit)',
  'log.bizLog': '业务日志 (Biz)',
  'log.globalTimeline': '全局时间线 (Timeline)',
} as const satisfies Record<string, string>;
