import { BusinessKey } from "../types/business";

export type PermissionAction =
  | "read"
  | "add"
  | "edit"
  | "delete"
  | "export"
  | "view"
  | "batch-delete"
  | "update_profile"
  | "update_password";

export type CheckPermissionSeeds<T> = {
  [P in keyof T & string]: {
    [M in keyof T[P] & string]: (
      M extends "" ? P : `${P}.${M}`
    ) extends BusinessKey
      ? readonly PermissionAction[]
      : never;
  };
};

export const permissionSeeds = {
  /** 系统管理 */
  system: {
    "": ["read"],
    /** 用户管理 */
    user: ["read", "add", "edit", "delete", "export"],
    /** 角色管理 */
    role: ["read", "add", "edit", "delete"],
    /** 权限管理 */
    permission: ["read", "add", "edit", "delete"],
    /** 部门管理 */
    department: ["read", "add", "edit", "delete"],
    /** 菜单管理 */
    menu: ["read", "add", "edit", "delete"],
    /** 角色权限管理 */
    role_permission: ["read", "add", "edit", "delete", "batch-delete"],
    /** 个人信息 */
    auth: ["read", "update_profile", "update_password"],
    /** 动态表单配置 */
    schema_form: ["read", "add", "edit", "delete"],
    /** 动态表单数据 */
    schema_form_data: ["read", "add", "edit", "delete"],
  },
  /** 邮件 */
  mail: {
    "": ["read"],
    /** 邮件账户 */
    account: ["read", "add", "edit", "delete"],
    /** 邮件模板 */
    template: ["read", "add", "edit", "delete"],
    /** 邮件日志 */
    log: ["read", "view"],
  },
  /** 国际化 */
  i18n: {
    "": ["read"],
    /** 语言管理 */
    language: ["read", "add", "edit", "delete"],
    /** 地区管理 */
    region: ["read", "add", "edit", "delete"],
    /** 翻译管理 */
    translation: ["read", "add", "edit", "delete"],
  },
  /** 运维 */
  maintenance: {
    "": ["read"],
    /** 缓存管理 */
    cache: ["read", "add", "edit", "delete", "view"],
    /** 登录日志 */
    audit_login: ["read"],
    /** 定时任务管理 */
    cron: ["read", "add", "edit", "delete"],
    /** API 采集任务管理 */
    api_task: ["read", "add", "edit", "delete"],
    /** API 文档管理 */
    api_docs: ["read", "add", "edit", "delete"],
  },
  /** 存储 */
  oss: {
    "": ["read"],
    /** 存储配置 */
    config: ["read", "add", "edit", "delete"],
    /** 文件管理 */
    file: ["read", "add", "edit", "delete"],
  },
  /** 企业 */
  enterprise: {
    "": ["read"],
    /** 考勤管理 */
    attendance: ["read", "add", "edit", "delete"],
  },
  /** AI */
  ai: {
    "": ["read"],
    /** AI 配置 */
    config: ["read", "add", "edit", "delete"],
    /** AI 对话 */
    chat: ["read"],
  },
  /** Swarm 集群 */
  swarm: {
    "": ["read"],
    /** Swarm 集群 Docker 服务管理 */
    docker: ["read", "add", "edit", "delete"],
    /** Swarm Docker配置管理 */
    docker_config: ["read", "add", "edit", "delete"],
    /** Swarm 节点管理 */
    nodes: ["read"],
  },
} as const;

// Ensure type safety of permissionSeeds against BusinessKey mapping
const _checkPermissionSeeds: CheckPermissionSeeds<typeof permissionSeeds> =
  permissionSeeds;
