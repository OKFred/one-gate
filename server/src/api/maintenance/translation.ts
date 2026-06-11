import type { BatchTranslationItem } from "@/db/initTranslation";

export const maintenanceTranslations: BatchTranslationItem[] = [
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.log.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务执行历史",
      "en-US": "Task Execution History",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.log.empty",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂无任务执行日志",
      "en-US": "No execution log available",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.log.id",
    isEnabled: true,
    langCodes: {
      "zh-CN": "ID",
      "en-US": "ID",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.log.status",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行状态",
      "en-US": "Status",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.log.startTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "开始时间",
      "en-US": "Start Time",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.log.duration",
    isEnabled: true,
    langCodes: {
      "zh-CN": "耗时 (毫秒)",
      "en-US": "Duration (ms)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.log.detail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行日志 / 异常堆栈",
      "en-US": "Log / Stack Trace",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.log.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行成功",
      "en-US": "Executed Successfully",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.log.unknownError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未知异常",
      "en-US": "Unknown Exception",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.button.close",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关闭",
      "en-US": "Close",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.filter.keywordPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索名称/任务Key",
      "en-US": "Search Name / Job Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.field.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务名称",
      "en-US": "Task Name",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.field.jobKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务唯一 Key",
      "en-US": "Job Unique Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.field.cronExpression",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Cron 表达式",
      "en-US": "Cron Expression",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.field.runCount",
    isEnabled: true,
    langCodes: {
      "zh-CN": "运行次数",
      "en-US": "Run Count",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.field.lastRunTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "上次运行时间",
      "en-US": "Last Run Time",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.field.nextRunTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "下次预定时间",
      "en-US": "Next Scheduled Time",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.jobKey.testLog",
    isEnabled: true,
    langCodes: {
      "zh-CN": "控制台测试日志任务 (test_log)",
      "en-US": "Console Test Log Task (test_log)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.jobKey.syncExternalData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "外部数据同步任务 (sync_external_data)",
      "en-US": "External Data Sync Task (sync_external_data)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.field.cronExpressionPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: */5 * * * * (每 5 分钟执行一次)",
      "en-US": "e.g. */5 * * * * (every 5 minutes)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.field.statusLabel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "是否开启任务",
      "en-US": "Enable Task",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.field.parameters",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务自定义参数 (JSON 字符串)",
      "en-US": "Custom Parameters (JSON string)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.status.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "成功",
      "en-US": "Success",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.status.fail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "失败",
      "en-US": "Fail",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.helper.parsing",
    isEnabled: true,
    langCodes: {
      "zh-CN": "正在解析 Cron 表达式...",
      "en-US": "Parsing Cron expression...",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.helper.frequency",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行频率：",
      "en-US": "Execution Frequency:",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.helper.nextTimes",
    isEnabled: true,
    langCodes: {
      "zh-CN": "预定下次执行时间 (未来 5 次)：",
      "en-US": "Scheduled Next Run Times (Next 5 runs):",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.helper.invalid",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Cron 表达式无效",
      "en-US": "Invalid Cron Expression",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.helper.reason",
    isEnabled: true,
    langCodes: {
      "zh-CN": "原因: {error}",
      "en-US": "Reason: {error}",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.helper.parseFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "解析失败",
      "en-US": "Parse Failed",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.helper.noData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口未返回数据",
      "en-US": "No data returned from API",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cron",
    tKey: "cron.helper.networkError",
    isEnabled: true,
    langCodes: {
      "zh-CN": "网络错误",
      "en-US": "Network Error",
    },
  },
  {
    application: "backend",
    business: "maintenance.cron",
    tKey: "cron.frequency.custom",
    isEnabled: true,
    langCodes: {
      "zh-CN": "自定义周期",
      "en-US": "Custom cycle",
    },
  },
  {
    application: "backend",
    business: "maintenance.cron",
    tKey: "cron.frequency.minutely",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每分钟执行一次",
      "en-US": "Execute every minute",
    },
  },
  {
    application: "backend",
    business: "maintenance.cron",
    tKey: "cron.frequency.minutes",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每 {minutes} 分钟执行一次",
      "en-US": "Execute every {minutes} minutes",
    },
  },
  {
    application: "backend",
    business: "maintenance.cron",
    tKey: "cron.frequency.hourly",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每小时执行一次",
      "en-US": "Execute every hour",
    },
  },
  {
    application: "backend",
    business: "maintenance.cron",
    tKey: "cron.frequency.hours",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每 {hours} 小时执行一次",
      "en-US": "Execute every {hours} hours",
    },
  },
  {
    application: "backend",
    business: "maintenance.cron",
    tKey: "cron.frequency.daily",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每天执行一次",
      "en-US": "Execute every day",
    },
  },
  {
    application: "backend",
    business: "maintenance.cron",
    tKey: "cron.frequency.days",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每 {days} 天执行一次",
      "en-US": "Execute every {days} days",
    },
  },
  {
    application: "backend",
    business: "maintenance.cron",
    tKey: "cron.frequency.seconds",
    isEnabled: true,
    langCodes: {
      "zh-CN": "每 {seconds} 秒执行一次",
      "en-US": "Execute every {seconds} seconds",
    },
  },
  {
    application: "frontend",
    business: "maintenance",
    tKey: "openapi.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口文档",
      "en-US": "API Documentation",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "缓存管理",
      "en-US": "Cache Management",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.columns.namespace",
    isEnabled: true,
    langCodes: {
      "zh-CN": "命名空间",
      "en-US": "Namespace",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.columns.keyCount",
    isEnabled: true,
    langCodes: {
      "zh-CN": "键数量",
      "en-US": "Key Count",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.columns.ttl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "过期时间",
      "en-US": "TTL",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.columns.key",
    isEnabled: true,
    langCodes: {
      "zh-CN": "键名",
      "en-US": "Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.filter.namespace",
    isEnabled: true,
    langCodes: {
      "zh-CN": "命名空间",
      "en-US": "Namespace",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.filter.namespacePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入命名空间名称",
      "en-US": "Enter namespace name",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.filter.keyPrefix",
    isEnabled: true,
    langCodes: {
      "zh-CN": "键名前缀",
      "en-US": "Key Prefix",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.filter.keyPrefixPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入键名前缀筛选",
      "en-US": "Enter key prefix to filter",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.currentNamespace",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前命名空间",
      "en-US": "Current Namespace",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.actions.viewKeys",
    isEnabled: true,
    langCodes: {
      "zh-CN": "查看键值",
      "en-US": "View Keys",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.actions.backToNamespaces",
    isEnabled: true,
    langCodes: {
      "zh-CN": "返回命名空间列表",
      "en-US": "Back to Namespaces",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.actions.add",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加缓存",
      "en-US": "Add Cache",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.addTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加缓存",
      "en-US": "Add Cache",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.editTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "编辑缓存",
      "en-US": "Edit Cache",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.namespace",
    isEnabled: true,
    langCodes: {
      "zh-CN": "命名空间",
      "en-US": "Namespace",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.key",
    isEnabled: true,
    langCodes: {
      "zh-CN": "键名",
      "en-US": "Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.keyPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入缓存键名",
      "en-US": "Enter cache key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.value",
    isEnabled: true,
    langCodes: {
      "zh-CN": "值",
      "en-US": "Value",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.valuePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "输入缓存值",
      "en-US": "Enter cache value",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.valueHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "支持文本或 JSON 格式",
      "en-US": "Supports text or JSON format",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.ttl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "过期时间（秒）",
      "en-US": "TTL (seconds)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.ttlPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "留空则永久保存",
      "en-US": "Leave empty for permanent",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.form.ttlHelp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "设置缓存过期时间，单位：秒",
      "en-US": "Set cache expiration time in seconds",
    },
  },
  {
    application: "frontend",
    business: "maintenance.cache",
    tKey: "cache.deleteConfirm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确定要删除此缓存项吗？",
      "en-US": "Are you sure you want to delete this cache item?",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "sidebar.menu.maintenance.auditLogin",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录审计",
      "en-US": "Login Audit",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录审计日志",
      "en-US": "Login Audit Log",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.column.userId",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户ID",
      "en-US": "User ID",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.column.loginTime",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录时间",
      "en-US": "Login Time",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.column.ip",
    isEnabled: true,
    langCodes: {
      "zh-CN": "IP地址",
      "en-US": "IP Address",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "maintenance.auditLogin.column.userAgent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "浏览器/设备",
      "en-US": "User Agent",
    },
  },
  {
    application: "frontend",
    business: "maintenance.audit_login",
    tKey: "businessType.maintenance.audit_login",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录审计",
      "en-US": "Login Audit",
    },
  },
  {
    application: "frontend",
    business: "maintenance.init",
    tKey: "maintenance.init.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据库初始化",
      "en-US": "Database Initialization",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "sidebar.menu.maintenance.apiTask",
    isEnabled: true,
    langCodes: {
      "zh-CN": "API 采集任务",
      "en-US": "API Tasks",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "businessType.maintenance.api_task",
    isEnabled: true,
    langCodes: {
      "zh-CN": "系统运维-API采集任务",
      "en-US": "Maintenance-API Task",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务名称",
      "en-US": "Task Name",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.taskKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务唯一 Key",
      "en-US": "Task Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.description",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务描述",
      "en-US": "Description",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.baseUrl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "基础 URL",
      "en-US": "Base URL",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.path",
    isEnabled: true,
    langCodes: {
      "zh-CN": "API 路径",
      "en-US": "API Path",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.method",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请求方法",
      "en-US": "HTTP Method",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.headers",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请求头（JSON）",
      "en-US": "Headers (JSON)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.requestSchema",
    isEnabled: true,
    langCodes: {
      "zh-CN": "入参 Schema（OAS3）",
      "en-US": "Request Schema (OAS3)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.responseSchema",
    isEnabled: true,
    langCodes: {
      "zh-CN": "响应 Schema（OAS3，可选）",
      "en-US": "Response Schema (OAS3, optional)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.timeoutMs",
    isEnabled: true,
    langCodes: {
      "zh-CN": "超时时间 (ms)",
      "en-US": "Timeout (ms)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.field.status",
    isEnabled: true,
    langCodes: {
      "zh-CN": "状态",
      "en-US": "Status",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.filter.keywordPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索名称/任务Key",
      "en-US": "Search Name / Task Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.button.run",
    isEnabled: true,
    langCodes: {
      "zh-CN": "立即执行",
      "en-US": "Run Now",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.run.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请求执行成功",
      "en-US": "Request executed successfully",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.run.failed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请求执行失败",
      "en-US": "Request execution failed",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.field.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "文档名称",
      "en-US": "Doc Name",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.field.docType",
    isEnabled: true,
    langCodes: {
      "zh-CN": "文档类型",
      "en-US": "Doc Type",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.field.version",
    isEnabled: true,
    langCodes: {
      "zh-CN": "版本",
      "en-US": "Version",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.field.description",
    isEnabled: true,
    langCodes: {
      "zh-CN": "描述",
      "en-US": "Description",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.field.content",
    isEnabled: true,
    langCodes: {
      "zh-CN": "文档内容",
      "en-US": "Content",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.button.upload",
    isEnabled: true,
    langCodes: {
      "zh-CN": "上传文档",
      "en-US": "Upload Doc",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.upload.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "上传成功",
      "en-US": "Uploaded successfully",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.upload.failed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "上传失败",
      "en-US": "Upload failed",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.filter.keywordPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索名称/描述",
      "en-US": "Search Name / Description",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.button.importFromDocs",
    isEnabled: true,
    langCodes: {
      "zh-CN": "从文档导入",
      "en-US": "Import from Docs",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "立即执行测试",
      "en-US": "Run Test",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.result",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行结果",
      "en-US": "Execution Result",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.response",
    isEnabled: true,
    langCodes: {
      "zh-CN": "响应内容 (Response)",
      "en-US": "Response Content",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.headers",
    isEnabled: true,
    langCodes: {
      "zh-CN": "响应头 (Headers)",
      "en-US": "Response Headers",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.noResponse",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无响应内容",
      "en-US": "No Response Content",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.noHeaders",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无响应头",
      "en-US": "No Response Headers",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.errorDetails",
    isEnabled: true,
    langCodes: {
      "zh-CN": "错误详情",
      "en-US": "Error Details",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.status",
    isEnabled: true,
    langCodes: {
      "zh-CN": "状态",
      "en-US": "Status",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.duration",
    isEnabled: true,
    langCodes: {
      "zh-CN": "耗时",
      "en-US": "Duration",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.run",
    isEnabled: true,
    langCodes: {
      "zh-CN": "立即执行",
      "en-US": "Run Test Now",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.running",
    isEnabled: true,
    langCodes: {
      "zh-CN": "执行中...",
      "en-US": "Running...",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.close",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关闭",
      "en-US": "Close",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.paramsInput",
    isEnabled: true,
    langCodes: {
      "zh-CN": "JSON 入参（请求 Body / Query 参数）",
      "en-US": "JSON Parameters (Request Body / Query)",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.paramsSchema",
    isEnabled: true,
    langCodes: {
      "zh-CN": "入参 Schema（OAS3 参考）：",
      "en-US": "Parameters Schema (OAS3 Reference):",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.form.uploadTip",
    isEnabled: true,
    langCodes: {
      "zh-CN": "支持 .json / .yaml / .yml 格式，上传后将自动解析文档基本信息。",
      "en-US":
        "Supports .json, .yaml, or .yml formats. Document info will be parsed automatically after uploading.",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_docs",
    tKey: "apiDocs.form.contentPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "可以直接粘贴 Swagger / OpenAPI JSON 或 YAML 内容...",
      "en-US":
        "You can paste Swagger / OpenAPI JSON or YAML content directly here...",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "从 Swagger/OpenAPI 文档批量导入 API 任务",
      "en-US": "Batch Import API Tasks from Swagger/OpenAPI Document",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.successPrefix",
    isEnabled: true,
    langCodes: {
      "zh-CN": "导入完成：成功 ",
      "en-US": "Import completed: ",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.successMiddle",
    isEnabled: true,
    langCodes: {
      "zh-CN": " 个，失败 ",
      "en-US": " succeeded, ",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.successSuffix",
    isEnabled: true,
    langCodes: {
      "zh-CN": " 个。",
      "en-US": " failed.",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.failedDetails",
    isEnabled: true,
    langCodes: {
      "zh-CN": "失败详情：",
      "en-US": "Failure Details:",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.taskKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "任务 Key",
      "en-US": "Task Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.errorReason",
    isEnabled: true,
    langCodes: {
      "zh-CN": "错误原因",
      "en-US": "Error Reason",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.selectDoc",
    isEnabled: true,
    langCodes: {
      "zh-CN": "选择已上传文档",
      "en-US": "Select Uploaded Document",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.baseUrl",
    isEnabled: true,
    langCodes: {
      "zh-CN": "基准 URL (Base URL)",
      "en-US": "Base URL",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.keyPrefix",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Key 前缀 (Prefix)",
      "en-US": "Key Prefix",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.selectedEndpoints",
    isEnabled: true,
    langCodes: {
      "zh-CN": "已选中的接口 ({{selected}} / {{total}})",
      "en-US": "Selected Endpoints ({{selected}} / {{total}})",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.searchPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索 Path / 名称...",
      "en-US": "Search Path / Name...",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.endpointName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口名称 / 描述",
      "en-US": "Endpoint Name / Description",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.generatedKey",
    isEnabled: true,
    langCodes: {
      "zh-CN": "生成后任务 Key",
      "en-US": "Generated Task Key",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.done",
    isEnabled: true,
    langCodes: {
      "zh-CN": "完成",
      "en-US": "Done",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.cancel",
    isEnabled: true,
    langCodes: {
      "zh-CN": "取消",
      "en-US": "Cancel",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.importing",
    isEnabled: true,
    langCodes: {
      "zh-CN": "导入中...",
      "en-US": "Importing...",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.import.start",
    isEnabled: true,
    langCodes: {
      "zh-CN": "开始导入",
      "en-US": "Start Import",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.schemaValid",
    isEnabled: true,
    langCodes: {
      "zh-CN": "响应符合 Schema 规范",
      "en-US": "Response matches schema specification",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.schemaInvalid",
    isEnabled: true,
    langCodes: {
      "zh-CN": "响应不符合 Schema 规范，错误如下：",
      "en-US": "Response does not match schema specification. Errors:",
    },
  },
  {
    application: "frontend",
    business: "maintenance.api_task",
    tKey: "apiTask.test.noSchema",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未配置响应 Schema，已跳过校验",
      "en-US": "No response schema configured, validation skipped",
    },
  },
];
