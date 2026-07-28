export const BUSINESS = {
  /** 国际化 */
  "admin.i18n": "admin.i18n",
  /** 国际化语言 */
  "admin.i18n.language": "admin.i18n.language",
  /** 国际化地区 */
  "admin.i18n.region": "admin.i18n.region",
  /** 国际化翻译 */
  "admin.i18n.translation": "admin.i18n.translation",
  /** 邮件 */
  "admin.mail": "admin.mail",
  /** 邮件账户 */
  "admin.mail.account": "admin.mail.account",
  /** 邮件模板 */
  "admin.mail.template": "admin.mail.template",
  /** 邮件操作 */
  "admin.mail.action": "admin.mail.action",
  /** 邮件收件人 */
  "admin.mail.recipient": "admin.mail.recipient",
  /** 企业邮件EDM */
  "enterprise.mail.edm": "enterprise.mail.edm",
  /** 邮件日志 */
  "admin.mail.log": "admin.mail.log",
  /** 运维 */
  "admin.maintenance": "admin.maintenance",
  /** 运维缓存 */
  "admin.maintenance.cache": "admin.maintenance.cache",
  /** 运维接口文档 */
  "admin.maintenance.api_docs": "admin.maintenance.api_docs",
  /** 运维合规 */
  "admin.maintenance.compliance": "admin.maintenance.compliance",
  /** 运维定时任务 */
  "admin.maintenance.cron": "admin.maintenance.cron",
  /** 运维 API Task */
  "admin.maintenance.api_task": "admin.maintenance.api_task",
  /** 运维登录日志 */
  "admin.maintenance.login_log": "admin.maintenance.login_log",
  /** 运维初始化 */
  "admin.maintenance.init": "admin.maintenance.init",
  /** 系统 */
  "admin.system": "admin.system",
  /** 系统鉴权 */
  "admin.system.auth": "admin.system.auth",
  /** 系统部门 */
  "admin.system.department": "admin.system.department",
  /** 系统菜单 */
  "admin.system.menu": "admin.system.menu",
  /** 系统权限 */
  "admin.system.permission": "admin.system.permission",
  /** 系统角色 */
  "admin.system.role": "admin.system.role",
  /** 系统角色权限 */
  "admin.system.role_permission": "admin.system.role_permission",
  /** 系统用户 */
  "admin.system.user": "admin.system.user",
  /** 动态表单 */
  "admin.data.schema_form": "admin.data.schema_form",
  /** 企业 */
  enterprise: "enterprise",
  /** 组织管理 */
  organization: "organization",
  /** 组织管理-考勤 */
  "organization.attendance": "organization.attendance",
  /** 事务管理 */
  executive: "executive",
  /** 事务管理-工作流 */
  "executive.workflow": "executive.workflow",
  /** 个人中心 */
  personal: "personal",

  /** 个人中心-账号配置 */
  "personal.base": "personal.base",
  /** 个人中心-邮件偏好 */
  "personal.base.preference": "personal.base.preference",
  /** 个人中心-健康与医疗 */
  "personal.health": "personal.health",
  /** 个人中心-收入状况 */
  "personal.finance": "personal.finance",
  /** 个人中心-家庭 */
  "personal.family": "personal.family",
  /** 个人中心-社交 */
  "personal.social": "personal.social",
  "admin.ai": "admin.ai",
  /** AI 配置 */
  "admin.ai.config": "admin.ai.config",
  /** AI 对话 */
  "admin.ai.chat": "admin.ai.chat",
  /** 全局 AI 搜索 */
  "admin.ai.search": "admin.ai.search",
  /** OpenAI 兼容服务 */
  "admin.ai.openai": "admin.ai.openai",
  /** Swarm */
  "admin.swarm": "admin.swarm",
  /** Swarm Docker Service */
  "admin.swarm.docker": "admin.swarm.docker",
  /** Swarm Nodes */
  "admin.swarm.nodes": "admin.swarm.nodes",
  /** Swarm Docker 配置 */
  "admin.swarm.docker_config": "admin.swarm.docker_config",
  /** 业务类型 */
  "business.type": "business.type",
  /** 组件 */
  components: "components",
  /** 公共 */
  common: "common",
  /** 业务异常 */
  "business.exception": "business.exception",

  /** 管理后台 */
  admin: "admin",
  /** RPA */
  "admin.rpa": "admin.rpa",
  /** RPA 配置 */
  "admin.rpa.config": "admin.rpa.config",
  /** 基础配置 */
  "admin.base": "admin.base",
  /** 基础配置 - 具体配置 */
  "admin.base.sys_config": "admin.base.sys_config",
  "enterprise.mail": "enterprise.mail",
  "personal.base.user_config": "personal.base.user_config",

  /** 基础配置 - 日志 */
  "admin.base.log": "admin.base.log",
  /** 数据库 */
  "admin.data": "admin.data",
  /** 表单数据 */
  "admin.data.schema_form_data": "admin.data.schema_form_data",
  /** 对象存储 */
  "admin.oss": "admin.oss",
  /** 对象存储配置 */
  "admin.oss.config": "admin.oss.config",
  /** 对象存储文件 */
  "admin.oss.file": "admin.oss.file",
  /** MQTT 消息管理 */
  "admin.mqtt": "admin.mqtt",
  /** MQTT 控制台 */
  "admin.mqtt.console": "admin.mqtt.console",
  /** MQTT 配置 */
  "admin.mqtt.config": "admin.mqtt.config",
  /** 实时通话 */
  "admin.voice": "admin.voice",
  /** 实时通话会话 */
  "admin.voice.session": "admin.voice.session",
  /** 实时通话配置 */
  "admin.voice.config": "admin.voice.config",
} as const;

export type BusinessKey = keyof typeof BUSINESS;
export type BusinessType = { [K in BusinessKey]: K };
