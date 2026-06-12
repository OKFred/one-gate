import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const maintenanceTranslations = {
  "maintenance.cron": [
    {
      tKey: "cron.log.title",
      langCodes: {
        "zh-CN": "任务执行历史",
        "en-US": "Task Execution History",
      },
    },
    {
      tKey: "cron.log.empty",
      langCodes: {
        "zh-CN": "暂无任务执行日志",
        "en-US": "No execution log available",
      },
    },
    {
      tKey: "cron.log.id",
      langCodes: {
        "zh-CN": "ID",
        "en-US": "ID",
      },
    },
    {
      tKey: "cron.log.status",
      langCodes: {
        "zh-CN": "执行状态",
        "en-US": "Status",
      },
    },
    {
      tKey: "cron.log.startTime",
      langCodes: {
        "zh-CN": "开始时间",
        "en-US": "Start Time",
      },
    },
    {
      tKey: "cron.log.duration",
      langCodes: {
        "zh-CN": "耗时 (毫秒)",
        "en-US": "Duration (ms)",
      },
    },
    {
      tKey: "cron.log.detail",
      langCodes: {
        "zh-CN": "执行日志 / 异常堆栈",
        "en-US": "Log / Stack Trace",
      },
    },
    {
      tKey: "cron.log.success",
      langCodes: {
        "zh-CN": "执行成功",
        "en-US": "Executed Successfully",
      },
    },
    {
      tKey: "cron.log.unknownError",
      langCodes: {
        "zh-CN": "未知异常",
        "en-US": "Unknown Exception",
      },
    },
    {
      tKey: "cron.button.close",
      langCodes: {
        "zh-CN": "关闭",
        "en-US": "Close",
      },
    },
    {
      tKey: "cron.filter.keywordPlaceholder",
      langCodes: {
        "zh-CN": "搜索名称/任务Key",
        "en-US": "Search Name / Job Key",
      },
    },
    {
      tKey: "cron.field.name",
      langCodes: {
        "zh-CN": "任务名称",
        "en-US": "Task Name",
      },
    },
    {
      tKey: "cron.field.jobKey",
      langCodes: {
        "zh-CN": "任务唯一 Key",
        "en-US": "Job Unique Key",
      },
    },
    {
      tKey: "cron.field.cronExpression",
      langCodes: {
        "zh-CN": "Cron 表达式",
        "en-US": "Cron Expression",
      },
    },
    {
      tKey: "cron.field.runCount",
      langCodes: {
        "zh-CN": "运行次数",
        "en-US": "Run Count",
      },
    },
    {
      tKey: "cron.field.lastRunTime",
      langCodes: {
        "zh-CN": "上次运行时间",
        "en-US": "Last Run Time",
      },
    },
    {
      tKey: "cron.field.nextRunTime",
      langCodes: {
        "zh-CN": "下次预定时间",
        "en-US": "Next Scheduled Time",
      },
    },
    {
      tKey: "cron.jobKey.testLog",
      langCodes: {
        "zh-CN": "控制台测试日志任务 (test_log)",
        "en-US": "Console Test Log Task (test_log)",
      },
    },
    {
      tKey: "cron.jobKey.syncExternalData",
      langCodes: {
        "zh-CN": "外部数据同步任务 (sync_external_data)",
        "en-US": "External Data Sync Task (sync_external_data)",
      },
    },
    {
      tKey: "cron.field.cronExpressionPlaceholder",
      langCodes: {
        "zh-CN": "例如: */5 * * * * (每 5 分钟执行一次)",
        "en-US": "e.g. */5 * * * * (every 5 minutes)",
      },
    },
    {
      tKey: "cron.field.statusLabel",
      langCodes: {
        "zh-CN": "是否开启任务",
        "en-US": "Enable Task",
      },
    },
    {
      tKey: "cron.field.parameters",
      langCodes: {
        "zh-CN": "任务自定义参数 (JSON 字符串)",
        "en-US": "Custom Parameters (JSON string)",
      },
    },
    {
      tKey: "cron.status.success",
      langCodes: {
        "zh-CN": "成功",
        "en-US": "Success",
      },
    },
    {
      tKey: "cron.status.fail",
      langCodes: {
        "zh-CN": "失败",
        "en-US": "Fail",
      },
    },
    {
      tKey: "cron.helper.parsing",
      langCodes: {
        "zh-CN": "正在解析 Cron 表达式...",
        "en-US": "Parsing Cron expression...",
      },
    },
    {
      tKey: "cron.helper.frequency",
      langCodes: {
        "zh-CN": "执行频率：",
        "en-US": "Execution Frequency:",
      },
    },
    {
      tKey: "cron.helper.nextTimes",
      langCodes: {
        "zh-CN": "预定下次执行时间 (未来 5 次)：",
        "en-US": "Scheduled Next Run Times (Next 5 runs):",
      },
    },
    {
      tKey: "cron.helper.invalid",
      langCodes: {
        "zh-CN": "Cron 表达式无效",
        "en-US": "Invalid Cron Expression",
      },
    },
    {
      tKey: "cron.helper.reason",
      langCodes: {
        "zh-CN": "原因: {error}",
        "en-US": "Reason: {error}",
      },
    },
    {
      tKey: "cron.helper.parseFailed",
      langCodes: {
        "zh-CN": "解析失败",
        "en-US": "Parse Failed",
      },
    },
    {
      tKey: "cron.helper.noData",
      langCodes: {
        "zh-CN": "接口未返回数据",
        "en-US": "No data returned from API",
      },
    },
    {
      tKey: "cron.helper.networkError",
      langCodes: {
        "zh-CN": "网络错误",
        "en-US": "Network Error",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.custom",
      langCodes: {
        "zh-CN": "自定义周期",
        "en-US": "Custom cycle",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.minutely",
      langCodes: {
        "zh-CN": "每分钟执行一次",
        "en-US": "Execute every minute",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.minutes",
      langCodes: {
        "zh-CN": "每 {minutes} 分钟执行一次",
        "en-US": "Execute every {minutes} minutes",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.hourly",
      langCodes: {
        "zh-CN": "每小时执行一次",
        "en-US": "Execute every hour",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.hours",
      langCodes: {
        "zh-CN": "每 {hours} 小时执行一次",
        "en-US": "Execute every {hours} hours",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.daily",
      langCodes: {
        "zh-CN": "每天执行一次",
        "en-US": "Execute every day",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.days",
      langCodes: {
        "zh-CN": "每 {days} 天执行一次",
        "en-US": "Execute every {days} days",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.seconds",
      langCodes: {
        "zh-CN": "每 {seconds} 秒执行一次",
        "en-US": "Execute every {seconds} seconds",
      },
    },
  ],
  maintenance: [
    {
      tKey: "openapi.title",
      langCodes: {
        "zh-CN": "接口文档",
        "en-US": "API Documentation",
      },
    },
  ],
  "maintenance.cache": [
    {
      tKey: "cache.title",
      langCodes: {
        "zh-CN": "缓存管理",
        "en-US": "Cache Management",
      },
    },
    {
      tKey: "cache.columns.namespace",
      langCodes: {
        "zh-CN": "命名空间",
        "en-US": "Namespace",
      },
    },
    {
      tKey: "cache.columns.keyCount",
      langCodes: {
        "zh-CN": "键数量",
        "en-US": "Key Count",
      },
    },
    {
      tKey: "cache.columns.ttl",
      langCodes: {
        "zh-CN": "过期时间",
        "en-US": "TTL",
      },
    },
    {
      tKey: "cache.columns.key",
      langCodes: {
        "zh-CN": "键名",
        "en-US": "Key",
      },
    },
    {
      tKey: "cache.filter.namespace",
      langCodes: {
        "zh-CN": "命名空间",
        "en-US": "Namespace",
      },
    },
    {
      tKey: "cache.filter.namespacePlaceholder",
      langCodes: {
        "zh-CN": "输入命名空间名称",
        "en-US": "Enter namespace name",
      },
    },
    {
      tKey: "cache.filter.keyPrefix",
      langCodes: {
        "zh-CN": "键名前缀",
        "en-US": "Key Prefix",
      },
    },
    {
      tKey: "cache.filter.keyPrefixPlaceholder",
      langCodes: {
        "zh-CN": "输入键名前缀筛选",
        "en-US": "Enter key prefix to filter",
      },
    },
    {
      tKey: "cache.currentNamespace",
      langCodes: {
        "zh-CN": "当前命名空间",
        "en-US": "Current Namespace",
      },
    },
    {
      tKey: "cache.actions.viewKeys",
      langCodes: {
        "zh-CN": "查看键值",
        "en-US": "View Keys",
      },
    },
    {
      tKey: "cache.actions.backToNamespaces",
      langCodes: {
        "zh-CN": "返回命名空间列表",
        "en-US": "Back to Namespaces",
      },
    },
    {
      tKey: "cache.actions.add",
      langCodes: {
        "zh-CN": "添加缓存",
        "en-US": "Add Cache",
      },
    },
    {
      tKey: "cache.form.addTitle",
      langCodes: {
        "zh-CN": "添加缓存",
        "en-US": "Add Cache",
      },
    },
    {
      tKey: "cache.form.editTitle",
      langCodes: {
        "zh-CN": "编辑缓存",
        "en-US": "Edit Cache",
      },
    },
    {
      tKey: "cache.form.namespace",
      langCodes: {
        "zh-CN": "命名空间",
        "en-US": "Namespace",
      },
    },
    {
      tKey: "cache.form.key",
      langCodes: {
        "zh-CN": "键名",
        "en-US": "Key",
      },
    },
    {
      tKey: "cache.form.keyPlaceholder",
      langCodes: {
        "zh-CN": "输入缓存键名",
        "en-US": "Enter cache key",
      },
    },
    {
      tKey: "cache.form.value",
      langCodes: {
        "zh-CN": "值",
        "en-US": "Value",
      },
    },
    {
      tKey: "cache.form.valuePlaceholder",
      langCodes: {
        "zh-CN": "输入缓存值",
        "en-US": "Enter cache value",
      },
    },
    {
      tKey: "cache.form.valueHelp",
      langCodes: {
        "zh-CN": "支持文本或 JSON 格式",
        "en-US": "Supports text or JSON format",
      },
    },
    {
      tKey: "cache.form.ttl",
      langCodes: {
        "zh-CN": "过期时间（秒）",
        "en-US": "TTL (seconds)",
      },
    },
    {
      tKey: "cache.form.ttlPlaceholder",
      langCodes: {
        "zh-CN": "留空则永久保存",
        "en-US": "Leave empty for permanent",
      },
    },
    {
      tKey: "cache.form.ttlHelp",
      langCodes: {
        "zh-CN": "设置缓存过期时间，单位：秒",
        "en-US": "Set cache expiration time in seconds",
      },
    },
    {
      tKey: "cache.deleteConfirm",
      langCodes: {
        "zh-CN": "确定要删除此缓存项吗？",
        "en-US": "Are you sure you want to delete this cache item?",
      },
    },
  ],
  "maintenance.audit_login": [
    {
      tKey: "sidebar.menu.maintenance.auditLogin",
      langCodes: {
        "zh-CN": "登录审计",
        "en-US": "Login Audit",
      },
    },
    {
      tKey: "maintenance.auditLogin.title",
      langCodes: {
        "zh-CN": "登录审计日志",
        "en-US": "Login Audit Log",
      },
    },
    {
      tKey: "maintenance.auditLogin.column.userId",
      langCodes: {
        "zh-CN": "用户ID",
        "en-US": "User ID",
      },
    },
    {
      tKey: "maintenance.auditLogin.column.loginTime",
      langCodes: {
        "zh-CN": "登录时间",
        "en-US": "Login Time",
      },
    },
    {
      tKey: "maintenance.auditLogin.column.ip",
      langCodes: {
        "zh-CN": "IP地址",
        "en-US": "IP Address",
      },
    },
    {
      tKey: "maintenance.auditLogin.column.userAgent",
      langCodes: {
        "zh-CN": "浏览器/设备",
        "en-US": "User Agent",
      },
    },
    {
      tKey: "businessType.maintenance.audit_login",
      langCodes: {
        "zh-CN": "登录审计",
        "en-US": "Login Audit",
      },
    },
  ],
  "maintenance.init": [
    {
      tKey: "maintenance.init.title",
      langCodes: {
        "zh-CN": "数据库初始化",
        "en-US": "Database Initialization",
      },
    },
  ],
  "maintenance.api_task": [
    {
      tKey: "sidebar.menu.maintenance.apiTask",
      langCodes: {
        "zh-CN": "API 采集任务",
        "en-US": "API Tasks",
      },
    },
    {
      tKey: "businessType.maintenance.api_task",
      langCodes: {
        "zh-CN": "系统运维-API采集任务",
        "en-US": "Maintenance-API Task",
      },
    },
    {
      tKey: "apiTask.field.name",
      langCodes: {
        "zh-CN": "任务名称",
        "en-US": "Task Name",
      },
    },
    {
      tKey: "apiTask.field.taskKey",
      langCodes: {
        "zh-CN": "任务唯一 Key",
        "en-US": "Task Key",
      },
    },
    {
      tKey: "apiTask.field.description",
      langCodes: {
        "zh-CN": "任务描述",
        "en-US": "Description",
      },
    },
    {
      tKey: "apiTask.field.baseUrl",
      langCodes: {
        "zh-CN": "基础 URL",
        "en-US": "Base URL",
      },
    },
    {
      tKey: "apiTask.field.path",
      langCodes: {
        "zh-CN": "API 路径",
        "en-US": "API Path",
      },
    },
    {
      tKey: "apiTask.field.method",
      langCodes: {
        "zh-CN": "请求方法",
        "en-US": "HTTP Method",
      },
    },
    {
      tKey: "apiTask.field.headers",
      langCodes: {
        "zh-CN": "请求头（JSON）",
        "en-US": "Headers (JSON)",
      },
    },
    {
      tKey: "apiTask.field.requestSchema",
      langCodes: {
        "zh-CN": "入参 Schema（OAS3）",
        "en-US": "Request Schema (OAS3)",
      },
    },
    {
      tKey: "apiTask.field.responseSchema",
      langCodes: {
        "zh-CN": "响应 Schema（OAS3，可选）",
        "en-US": "Response Schema (OAS3, optional)",
      },
    },
    {
      tKey: "apiTask.field.timeoutMs",
      langCodes: {
        "zh-CN": "超时时间 (ms)",
        "en-US": "Timeout (ms)",
      },
    },
    {
      tKey: "apiTask.field.status",
      langCodes: {
        "zh-CN": "状态",
        "en-US": "Status",
      },
    },
    {
      tKey: "apiTask.filter.keywordPlaceholder",
      langCodes: {
        "zh-CN": "搜索名称/任务Key",
        "en-US": "Search Name / Task Key",
      },
    },
    {
      tKey: "apiTask.button.run",
      langCodes: {
        "zh-CN": "立即执行",
        "en-US": "Run Now",
      },
    },
    {
      tKey: "apiTask.run.success",
      langCodes: {
        "zh-CN": "请求执行成功",
        "en-US": "Request executed successfully",
      },
    },
    {
      tKey: "apiTask.run.failed",
      langCodes: {
        "zh-CN": "请求执行失败",
        "en-US": "Request execution failed",
      },
    },
    {
      tKey: "apiTask.button.importFromDocs",
      langCodes: {
        "zh-CN": "从文档导入",
        "en-US": "Import from Docs",
      },
    },
    {
      tKey: "apiTask.test.title",
      langCodes: {
        "zh-CN": "立即执行测试",
        "en-US": "Run Test",
      },
    },
    {
      tKey: "apiTask.test.result",
      langCodes: {
        "zh-CN": "执行结果",
        "en-US": "Execution Result",
      },
    },
    {
      tKey: "apiTask.test.response",
      langCodes: {
        "zh-CN": "响应内容 (Response)",
        "en-US": "Response Content",
      },
    },
    {
      tKey: "apiTask.test.headers",
      langCodes: {
        "zh-CN": "响应头 (Headers)",
        "en-US": "Response Headers",
      },
    },
    {
      tKey: "apiTask.test.noResponse",
      langCodes: {
        "zh-CN": "无响应内容",
        "en-US": "No Response Content",
      },
    },
    {
      tKey: "apiTask.test.noHeaders",
      langCodes: {
        "zh-CN": "无响应头",
        "en-US": "No Response Headers",
      },
    },
    {
      tKey: "apiTask.test.errorDetails",
      langCodes: {
        "zh-CN": "错误详情",
        "en-US": "Error Details",
      },
    },
    {
      tKey: "apiTask.test.status",
      langCodes: {
        "zh-CN": "状态",
        "en-US": "Status",
      },
    },
    {
      tKey: "apiTask.test.duration",
      langCodes: {
        "zh-CN": "耗时",
        "en-US": "Duration",
      },
    },
    {
      tKey: "apiTask.test.run",
      langCodes: {
        "zh-CN": "立即执行",
        "en-US": "Run Test Now",
      },
    },
    {
      tKey: "apiTask.test.running",
      langCodes: {
        "zh-CN": "执行中...",
        "en-US": "Running...",
      },
    },
    {
      tKey: "apiTask.test.close",
      langCodes: {
        "zh-CN": "关闭",
        "en-US": "Close",
      },
    },
    {
      tKey: "apiTask.test.paramsInput",
      langCodes: {
        "zh-CN": "JSON 入参（请求 Body / Query 参数）",
        "en-US": "JSON Parameters (Request Body / Query)",
      },
    },
    {
      tKey: "apiTask.test.paramsSchema",
      langCodes: {
        "zh-CN": "入参 Schema（OAS3 参考）：",
        "en-US": "Parameters Schema (OAS3 Reference):",
      },
    },
    {
      tKey: "apiTask.import.title",
      langCodes: {
        "zh-CN": "从 Swagger/OpenAPI 文档批量导入 API 任务",
        "en-US": "Batch Import API Tasks from Swagger/OpenAPI Document",
      },
    },
    {
      tKey: "apiTask.import.successPrefix",
      langCodes: {
        "zh-CN": "导入完成：成功 ",
        "en-US": "Import completed: ",
      },
    },
    {
      tKey: "apiTask.import.successMiddle",
      langCodes: {
        "zh-CN": " 个，失败 ",
        "en-US": " succeeded, ",
      },
    },
    {
      tKey: "apiTask.import.successSuffix",
      langCodes: {
        "zh-CN": " 个。",
        "en-US": " failed.",
      },
    },
    {
      tKey: "apiTask.import.failedDetails",
      langCodes: {
        "zh-CN": "失败详情：",
        "en-US": "Failure Details:",
      },
    },
    {
      tKey: "apiTask.import.taskKey",
      langCodes: {
        "zh-CN": "任务 Key",
        "en-US": "Task Key",
      },
    },
    {
      tKey: "apiTask.import.errorReason",
      langCodes: {
        "zh-CN": "错误原因",
        "en-US": "Error Reason",
      },
    },
    {
      tKey: "apiTask.import.selectDoc",
      langCodes: {
        "zh-CN": "选择已上传文档",
        "en-US": "Select Uploaded Document",
      },
    },
    {
      tKey: "apiTask.import.baseUrl",
      langCodes: {
        "zh-CN": "基准 URL (Base URL)",
        "en-US": "Base URL",
      },
    },
    {
      tKey: "apiTask.import.keyPrefix",
      langCodes: {
        "zh-CN": "Key 前缀 (Prefix)",
        "en-US": "Key Prefix",
      },
    },
    {
      tKey: "apiTask.import.selectedEndpoints",
      langCodes: {
        "zh-CN": "已选中的接口 ({{selected}} / {{total}})",
        "en-US": "Selected Endpoints ({{selected}} / {{total}})",
      },
    },
    {
      tKey: "apiTask.import.searchPlaceholder",
      langCodes: {
        "zh-CN": "搜索 Path / 名称...",
        "en-US": "Search Path / Name...",
      },
    },
    {
      tKey: "apiTask.import.endpointName",
      langCodes: {
        "zh-CN": "接口名称 / 描述",
        "en-US": "Endpoint Name / Description",
      },
    },
    {
      tKey: "apiTask.import.generatedKey",
      langCodes: {
        "zh-CN": "生成后任务 Key",
        "en-US": "Generated Task Key",
      },
    },
    {
      tKey: "apiTask.import.done",
      langCodes: {
        "zh-CN": "完成",
        "en-US": "Done",
      },
    },
    {
      tKey: "apiTask.import.cancel",
      langCodes: {
        "zh-CN": "取消",
        "en-US": "Cancel",
      },
    },
    {
      tKey: "apiTask.import.importing",
      langCodes: {
        "zh-CN": "导入中...",
        "en-US": "Importing...",
      },
    },
    {
      tKey: "apiTask.import.start",
      langCodes: {
        "zh-CN": "开始导入",
        "en-US": "Start Import",
      },
    },
    {
      tKey: "apiTask.test.schemaValid",
      langCodes: {
        "zh-CN": "响应符合 Schema 规范",
        "en-US": "Response matches schema specification",
      },
    },
    {
      tKey: "apiTask.test.schemaInvalid",
      langCodes: {
        "zh-CN": "响应不符合 Schema 规范，错误如下：",
        "en-US": "Response does not match schema specification. Errors:",
      },
    },
    {
      tKey: "apiTask.test.noSchema",
      langCodes: {
        "zh-CN": "未配置响应 Schema，已跳过校验",
        "en-US": "No response schema configured, validation skipped",
      },
    },
  ],
  "maintenance.api_docs": [
    {
      tKey: "apiDocs.field.name",
      langCodes: {
        "zh-CN": "文档名称",
        "en-US": "Doc Name",
      },
    },
    {
      tKey: "apiDocs.field.docType",
      langCodes: {
        "zh-CN": "文档类型",
        "en-US": "Doc Type",
      },
    },
    {
      tKey: "apiDocs.field.version",
      langCodes: {
        "zh-CN": "版本",
        "en-US": "Version",
      },
    },
    {
      tKey: "apiDocs.field.description",
      langCodes: {
        "zh-CN": "描述",
        "en-US": "Description",
      },
    },
    {
      tKey: "apiDocs.field.content",
      langCodes: {
        "zh-CN": "文档内容",
        "en-US": "Content",
      },
    },
    {
      tKey: "apiDocs.button.upload",
      langCodes: {
        "zh-CN": "上传文档",
        "en-US": "Upload Doc",
      },
    },
    {
      tKey: "apiDocs.upload.success",
      langCodes: {
        "zh-CN": "上传成功",
        "en-US": "Uploaded successfully",
      },
    },
    {
      tKey: "apiDocs.upload.failed",
      langCodes: {
        "zh-CN": "上传失败",
        "en-US": "Upload failed",
      },
    },
    {
      tKey: "apiDocs.filter.keywordPlaceholder",
      langCodes: {
        "zh-CN": "搜索名称/描述",
        "en-US": "Search Name / Description",
      },
    },
    {
      tKey: "apiDocs.form.uploadTip",
      langCodes: {
        "zh-CN":
          "支持 .json / .yaml / .yml 格式，上传后将自动解析文档基本信息。",
        "en-US":
          "Supports .json, .yaml, or .yml formats. Document info will be parsed automatically after uploading.",
      },
    },
    {
      tKey: "apiDocs.form.contentPlaceholder",
      langCodes: {
        "zh-CN": "可以直接粘贴 Swagger / OpenAPI JSON 或 YAML 内容...",
        "en-US":
          "You can paste Swagger / OpenAPI JSON or YAML content directly here...",
      },
    },
  ],
} satisfies Record<
  Extract<
    BusinessKey,
    | "maintenance.cron"
    | "maintenance"
    | "maintenance.cache"
    | "maintenance.audit_login"
    | "maintenance.init"
    | "maintenance.api_task"
    | "maintenance.api_docs"
  >,
  TranslationInputItem[]
>;
