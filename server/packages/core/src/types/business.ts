export const BUSINESS = {
  /** 国际化 */
  "infra.i18n": "infra.i18n",
  /** 国际化语言 */
  "infra.i18n.language": "infra.i18n.language",
  /** 国际化地区 */
  "infra.i18n.region": "infra.i18n.region",
  /** 国际化翻译 */
  "infra.i18n.translation": "infra.i18n.translation",
  /** 邮件 */
  "infra.mail": "infra.mail",
  /** 邮件账户 */
  "infra.mail.account": "infra.mail.account",
  /** 邮件模板 */
  "infra.mail.template": "infra.mail.template",
  /** 邮件操作 */
  "infra.mail.action": "infra.mail.action",
  /** 邮件日志 */
  "infra.mail.log": "infra.mail.log",
  /** 运维 */
  "infra.maintenance": "infra.maintenance",
  /** 运维缓存 */
  "infra.maintenance.cache": "infra.maintenance.cache",
  /** 运维接口文档 */
  "infra.maintenance.api_docs": "infra.maintenance.api_docs",
  /** 运维合规 */
  "infra.maintenance.compliance": "infra.maintenance.compliance",
  /** 运维定时任务 */
  "infra.maintenance.cron": "infra.maintenance.cron",
  /** 运维 API Task */
  "infra.maintenance.api_task": "infra.maintenance.api_task",
  /** 运维登录日志 */
  "infra.maintenance.audit_login": "infra.maintenance.audit_login",
  /** 运维初始化 */
  "infra.maintenance.init": "infra.maintenance.init",
  /** 系统 */
  "infra.system": "infra.system",
  /** 系统鉴权 */
  "infra.system.auth": "infra.system.auth",
  /** 系统部门 */
  "infra.system.department": "infra.system.department",
  /** 系统菜单 */
  "infra.system.menu": "infra.system.menu",
  /** 系统权限 */
  "infra.system.permission": "infra.system.permission",
  /** 系统角色 */
  "infra.system.role": "infra.system.role",
  /** 系统角色权限 */
  "infra.system.role_permission": "infra.system.role_permission",
  /** 系统用户 */
  "infra.system.user": "infra.system.user",
  /** 数据管理动态表单配置 */
  "infra.data.schema_form": "infra.data.schema_form",
  /** 企业 */
  enterprise: "enterprise",
  /** 企业考勤 */
  "enterprise.attendance": "enterprise.attendance",
  /** 企业工作流 */
  "enterprise.workflow": "enterprise.workflow",
  /** 企业工作流配置 */
  "enterprise.workflow_config": "enterprise.workflow_config",
  /** AI */
  "infra.ai": "infra.ai",
  /** AI 配置 */
  "infra.ai.config": "infra.ai.config",
  /** AI 对话 */
  "infra.ai.chat": "infra.ai.chat",
  /** Swarm */
  "infra.swarm": "infra.swarm",
  /** Swarm Docker Service */
  "infra.swarm.docker": "infra.swarm.docker",
  /** Swarm Nodes */
  "infra.swarm.nodes": "infra.swarm.nodes",
  /** Swarm Docker 配置 */
  "infra.swarm.docker_config": "infra.swarm.docker_config",
  /** 业务类型 */
  "business.type": "business.type",
  /** 组件 */
  components: "components",
  /** 公共 */
  common: "common",
  /** 业务异常 */
  "business.exception": "business.exception",

  /** 基础设施 */
  infra: "infra",
  /** 数据管理 */
  "infra.data": "infra.data",
  /** 数据管理 动态表单数据 */
  "infra.data.schema_form_data": "infra.data.schema_form_data",
  /** 数据管理 OSS */
  "infra.data.oss": "infra.data.oss",
  /** 数据管理 OSS 配置 */
  "infra.data.oss.config": "infra.data.oss.config",
  /** 数据管理 OSS 文件 */
  "infra.data.oss.file": "infra.data.oss.file",
} as const;

export type BusinessKey = keyof typeof BUSINESS;
export type BusinessType = { [K in BusinessKey]: K };
