export type BusinessType = {
  /** 国际化 */
  i18n: "i18n";
  /** 国际化语言 */
  "i18n.language": "i18n.language";
  /** 国际化地区 */
  "i18n.region": "i18n.region";
  /** 国际化翻译 */
  "i18n.translation": "i18n.translation";
  /** 邮件 */
  mail: "mail";
  /** 邮件账户 */
  "mail.account": "mail.account";
  /** 邮件模板 */
  "mail.template": "mail.template";
  /** 邮件操作 */
  "mail.action": "mail.action";
  /** 邮件日志 */
  "mail.log": "mail.log";
  /** 运维 */
  maintenance: "maintenance";
  /** 运维缓存 */
  "maintenance.cache": "maintenance.cache";
  /** 运维接口文档 */
  "maintenance.api_docs": "maintenance.api_docs";
  /** 运维合规 */
  "maintenance.compliance": "maintenance.compliance";
  /** 系统 */
  system: "system";
  /** 系统鉴权 */
  "system.auth": "system.auth";
  /** 系统部门 */
  "system.department": "system.department";
  /** 系统菜单 */
  "system.menu": "system.menu";
  /** 系统权限 */
  "system.permission": "system.permission";
  /** 系统角色 */
  "system.role": "system.role";
  /** 系统角色权限 */
  "system.role_permission": "system.role_permission";
  /** 系统用户 */
  "system.user": "system.user";
};
export type BusinessKey = keyof BusinessType;
