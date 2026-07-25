/**
 * admin app — 邮件管理页面文案
 * 覆盖：mail/translation.ts 中所有 frontend 条目
 * 注：mail.scope.* 从 shared.ts 解耦至此
 */
export const mail = {
  // 邮件作用域（原在 shared.ts 中错误归属）
  'mail.scope': '作用域',
  'mail.scope.sys': '系统级',
  'mail.scope.biz': '企业级',
  'mail.scope.user': '个人级',

  // 邮件账户
  'account.table.nickname': '昵称',
  'account.table.email': '邮箱',
  'account.table.host': '主机',
  'account.table.port': '端口',
  'account.table.password': '密码',

  // 发送邮件
  'send.dialog.customFrom': '或直接输入发件邮箱',
  'send.dialog.customFromHelp': '如果没有配置的账户，可以直接输入邮箱地址',
  'send.dialog.recipientName': '姓名',
  'send.dialog.recipientEmail': '邮箱',
  'send.dialog.addRecipient': '添加收件人',
  'send.dialog.removeRecipient': '移除收件人',
  'send.dialog.subject': '主题',
  'send.dialog.contentLoaded': '模板内容已加载，您可以在此基础上编辑...',
  'send.action.send': '发送',
  'send.title': '发送邮件',
  'send.recipients': '收件人',
  'send.addRecipient': '添加收件人',
  'send.noTemplate': '不使用模板 - 手动编写内容',
  'send.templateName': '模板名',
  'send.creator': '创建人',
  'send.category': '分类',
  'send.dialog.contentLabel': '邮件内容',

  // 邮件模板
  'template.table.name': '模板名称',
  'template.table.nameHelp': '邮件模板的唯一标识名称',
  'template.table.subject': '邮件标题',
  'template.table.subjectHelp': '邮件的主题行',
  'template.table.langCodeHelp': '模板使用的语言代码（可选）',
  'template.table.category': '模板分类',
  'template.table.categoryHelp': '模板的分类标签（可选）',
  'template.table.contentLabel': '邮件内容',
  'template.table.contentHelp': '使用富文本编辑器编写邮件模板内容，支持HTML格式',
  'template.table.title': '邮件标题',
  'dialog.title.preview': '预览',
  'template.preview.basicInfo': '基本信息',
  'template.preview.tags': '标签',

  // 邮件日志
  'log.table.templateParams': '模板参数',
  'log.table.errorCode': '错误代码',
  'log.table.errorDetails': '错误详情',
  'log.table.basicInfo': '基本信息',
  'log.table.timeInfo': '时间信息',
  'log.table.templateInfo': '模板信息',
  'log.table.errorInfo': '错误信息',
  'log.table.subject': '标题',
  'log.table.recipient': '收件人',
  'log.table.sender': '发件人',
  'log.table.sendTime': '发送时间',
} as const satisfies Record<string, string>;
