import { BusinessKey } from "../types/business";

export type PermissionAction =
  | "read"
  | "add"
  | "edit"
  | "delete"
  | "export"
  | "view"
  | "batch-delete";

export type CheckPermissionSeeds<T, Parent extends string = ""> = {
  [K in keyof T & string]: T[K] extends readonly PermissionAction[]
    ? (
        K extends "" ? Parent : Parent extends "" ? K : `${Parent}.${K}`
      ) extends BusinessKey
      ? readonly PermissionAction[]
      : never
    : CheckPermissionSeeds<T[K], Parent extends "" ? K : `${Parent}.${K}`>;
};

export const permissionSeeds = {
  /** 底座 */
  "admin.base": {
    "": ["read"],
    sys_config: ["read", "add", "edit", "delete"],
    /** 日志 */
    log: ["read"],
  },
  /** 系统管理 */
  "admin.system": {
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
    auth: ["read", "edit"],
    /** API 令牌管理 */
    api_token: ["read", "add", "edit", "delete"],
  },
  /** 邮件 */
  "admin.mail": {
    /** 自动生成: recipient */
    recipient: ["read", "add", "edit", "delete"],
    "": ["read"],
    /** 邮件账户 */
    account: ["read", "add", "edit", "delete"],
    /** 邮件模板 */
    template: ["read", "add", "edit", "delete"],
    /** 邮件日志 */
    log: ["read", "view"],
    /** 邮件操作 */
    action: ["read", "add"],
  },
  /** 国际化 */
  "admin.i18n": {
    "": ["read"],
    /** 语言管理 */
    language: ["read", "add", "edit", "delete"],
    /** 地区管理 */
    region: ["read", "add", "edit", "delete"],
    /** 翻译管理 */
    translation: ["read", "add", "edit", "delete"],
  },
  /** 运维 */
  "admin.maintenance": {
    "": ["read"],
    /** 缓存管理 */
    cache: ["read", "add", "edit", "delete", "view"],
    /** 登录日志 */
    login_log: ["read"],
    /** 定时任务管理 */
    cron: ["read", "add", "edit", "delete"],
    /** API 采集任务管理 */
    api_task: ["read", "add", "edit", "delete"],
    /** API 文档管理 */
    api_docs: ["read", "add", "edit", "delete"],
    /** 合规归档 */
    compliance: ["read"],
    /** 初始化数据 */
    init: ["read"],
  },
  /** 基础设施 */
  admin: {
    "": ["read"],
  },
  /** 数据库 */
  "admin.data": {
    "": ["read"],
    /** 动态表单 */
    schema_form: ["read", "add", "edit", "delete"],
    /** 表单数据 */
    schema_form_data: ["read", "add", "edit", "delete"],
  },
  /** 对象存储 */
  "admin.oss": {
    "": ["read"],
    /** 存储配置 */
    config: ["read", "add", "edit", "delete"],
    /** 文件管理 */
    file: ["read", "add", "edit", "delete"],
  },
  /** 企业管理 */
  enterprise: {
    "": ["read"],
  },
  "enterprise.mail": {
    "": ["read"],
    edm: ["read", "add", "edit", "delete"],
  },
  /** 组织管理 */
  organization: {
    "": ["read"],
    /** 考勤管理 */
    attendance: ["read", "add", "edit", "delete"],
  },
  /** 事务管理 */
  executive: {
    "": ["read"],
    /** 工作流编排 */
    workflow: ["read", "add", "edit", "delete"],
  },
  /** 个人中心 */
  personal: {
    "": ["read"],

    /** 账号配置 */
    base: {
      "": ["read"],
      preference: ["read", "add", "edit", "delete"],
      user_config: ["read", "add", "edit", "delete"],
    },
    /** 健康与医疗 */
    health: ["read", "add", "edit", "delete"],
    /** 收入状况 */
    finance: ["read", "add", "edit", "delete"],
    /** 家庭 */
    family: ["read", "add", "edit", "delete"],
    /** 社交 */
    social: ["read", "add", "edit", "delete"],
  },
  /** AI */
  "admin.ai": {
    "": ["read"],
    /** AI 配置 */
    config: ["read", "add", "edit", "delete"],
    /** AI 对话 */
    chat: ["read"],
    /** 全局 AI 搜索 */
    search: ["read"],
    /** OpenAI 兼容服务 */
    openai: ["read"],
  },
  /** Swarm 集群 */
  "admin.swarm": {
    "": ["read"],
    /** Swarm 集群 Docker 服务管理 */
    docker: ["read", "add", "edit", "delete"],
    /** Swarm Docker配置管理 */
    docker_config: ["read", "add", "edit", "delete"],
    /** Swarm 节点管理 */
    nodes: ["read"],
  },
  /** RPA */
  "admin.rpa": {
    "": ["read"],
    /** RPA 配置 */
    config: ["read", "add", "edit", "delete"],
  },
  /** MQTT 消息管理 */
  "admin.mqtt": {
    "": ["read"],
    /** MQTT 控制台 */
    console: ["read", "add", "edit", "delete"],
    /** MQTT 配置 */
    config: ["read", "add", "edit", "delete"],
  },
  /** 实时通话 */
  "admin.voice": {
    "": ["read"],
    /** 通话会话 */
    session: ["read", "add", "edit"],
    /** 服务配置 */
    config: ["read", "add", "edit", "delete"],
  },
} as const;

// Ensure type safety of permissionSeeds against BusinessKey mapping
const _checkPermissionSeeds: CheckPermissionSeeds<typeof permissionSeeds> =
  permissionSeeds;
