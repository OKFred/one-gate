import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const sharedTranslations = {
  "business.type": [
    {
      tKey: "sidebar.menu.admin",
      langCodes: {
        "zh-CN": "管理后台",
        "en-US": "Admin Backend",
      },
    },
    {
      tKey: "sidebar.menu.organization",
      langCodes: {
        "zh-CN": "组织管理",
        "en-US": "Organization",
      },
    },
    {
      tKey: "sidebar.menu.organization.attendance",
      langCodes: {
        "zh-CN": "考勤",
        "en-US": "Attendance",
      },
    },
    {
      tKey: "sidebar.menu.executive",
      langCodes: {
        "zh-CN": "事务管理",
        "en-US": "Executive",
      },
    },
    {
      tKey: "sidebar.menu.personal",
      langCodes: {
        "zh-CN": "个人中心",
        "en-US": "Personal",
      },
    },
    {
      tKey: "sidebar.menu.personal.profile",
      langCodes: {
        "zh-CN": "个人信息",
        "en-US": "Personal Profile",
      },
    },
    {
      tKey: "sidebar.menu.personal.base",
      langCodes: {
        "zh-CN": "账号配置",
        "en-US": "Account Config",
      },
    },
    {
      tKey: "sidebar.menu.personal.base.preference",
      langCodes: {
        "zh-CN": "邮件偏好",
        "en-US": "Preference",
      },
    },
    {
      tKey: "sidebar.menu.personal.health",
      langCodes: {
        "zh-CN": "健康与医疗",
        "en-US": "Health & Medical",
      },
    },
    {
      tKey: "sidebar.menu.personal.finance",
      langCodes: {
        "zh-CN": "收入状况",
        "en-US": "Income & Finances",
      },
    },
    {
      tKey: "sidebar.menu.personal.family",
      langCodes: {
        "zh-CN": "家庭成员",
        "en-US": "Family Members",
      },
    },
    {
      tKey: "sidebar.menu.personal.social",
      langCodes: {
        "zh-CN": "社交网络",
        "en-US": "Social Network",
      },
    },
    {
      tKey: "businessType.personal.health",
      langCodes: {
        "zh-CN": "个人中心-健康与医疗",
        "en-US": "Personal-Health & Medical",
      },
    },
    {
      tKey: "businessType.personal.finance",
      langCodes: {
        "zh-CN": "个人中心-收入状况",
        "en-US": "Personal-Income & Finances",
      },
    },
    {
      tKey: "businessType.personal.family",
      langCodes: {
        "zh-CN": "个人中心-家庭",
        "en-US": "Personal-Family",
      },
    },
    {
      tKey: "businessType.personal.social",
      langCodes: {
        "zh-CN": "个人中心-社交网络",
        "en-US": "Personal-Social Network",
      },
    },
    {
      tKey: "sidebar.menu.data",
      langCodes: {
        "zh-CN": "数据库",
        "en-US": "Database",
      },
    },
    {
      tKey: "sidebar.menu.maintenance.cron",
      langCodes: {
        "zh-CN": "定时任务",
        "en-US": "Scheduled Tasks",
      },
    },
    {
      tKey: "businessType.maintenance.cron",
      langCodes: {
        "zh-CN": "系统运维-定时任务",
        "en-US": "Maintenance-Cron Job",
      },
    },
    {
      tKey: "sidebar.menu.ai",
      langCodes: {
        "zh-CN": "AI",
        "en-US": "AI",
      },
    },
    {
      tKey: "sidebar.menu.admin.rpa",
      langCodes: {
        "zh-CN": "RPA",
        "en-US": "RPA",
      },
    },
    {
      tKey: "sidebar.menu.ai.config",
      langCodes: {
        "zh-CN": "模型配置",
        "en-US": "Model Configuration",
      },
    },
    {
      tKey: "sidebar.menu.ai.chat",
      langCodes: {
        "zh-CN": "AI 助手对话",
        "en-US": "AI Playground Chat",
      },
    },
    {
      tKey: "sidebar.menu.ai.search",
      langCodes: {
        "zh-CN": "全局 AI 搜索",
        "en-US": "Global AI Search",
      },
    },
    {
      tKey: "sidebar.menu.swarm",
      langCodes: {
        "zh-CN": "Swarm集群",
        "en-US": "Swarm Cluster",
      },
    },
    {
      tKey: "sidebar.menu.swarm.docker",
      langCodes: {
        "zh-CN": "Docker服务",
        "en-US": "Docker Service",
      },
    },
    {
      tKey: "sidebar.menu.swarm.dockerConfig",
      langCodes: {
        "zh-CN": "Docker配置",
        "en-US": "Docker Config",
      },
    },
    {
      tKey: "businessType.swarm.docker_config",
      langCodes: {
        "zh-CN": "Swarm集群-Docker配置",
        "en-US": "Swarm-Docker Config",
      },
    },
    {
      tKey: "sidebar.menu.emptyPrompt",
      langCodes: {
        "zh-CN": "菜单为空，请联系管理员添加菜单",
        "en-US":
          "The menu is empty. Please contact the administrator to add it.",
      },
    },
    {
      tKey: "sidebar.menu.home",
      langCodes: {
        "zh-CN": "主页",
        "en-US": "Home",
      },
    },
    {
      tKey: "sidebar.menu.me",
      langCodes: {
        "zh-CN": "个人资料",
        "en-US": "My Profile",
      },
    },
    {
      tKey: "sidebar.menu.admin.base.log",
      langCodes: {
        "zh-CN": "日志",
        "en-US": "Logs",
      },
    },
    {
      tKey: "sidebar.menu.mail",
      langCodes: {
        "zh-CN": "邮件管理",
        "en-US": "Mail Management",
      },
    },
    {
      tKey: "sidebar.menu.mail.template",
      langCodes: {
        "zh-CN": "模板",
        "en-US": "Templates",
      },
    },
    {
      tKey: "sidebar.menu.mail.log",
      langCodes: {
        "zh-CN": "日志",
        "en-US": "Logs",
      },
    },
    {
      tKey: "sidebar.menu.mail.send",
      langCodes: {
        "zh-CN": "发送",
        "en-US": "Send",
      },
    },
    {
      tKey: "sidebar.menu.mail.account",
      langCodes: {
        "zh-CN": "账户",
        "en-US": "Accounts",
      },
    },
    {
      tKey: "sidebar.menu.system",
      langCodes: {
        "zh-CN": "系统管理",
        "en-US": "System",
      },
    },
    {
      tKey: "sidebar.menu.system.role",
      langCodes: {
        "zh-CN": "角色",
        "en-US": "Roles",
      },
    },
    {
      tKey: "sidebar.menu.user",
      langCodes: {
        "zh-CN": "用户",
        "en-US": "Users",
      },
    },
    {
      tKey: "sidebar.menu.system.department",
      langCodes: {
        "zh-CN": "部门",
        "en-US": "Departments",
      },
    },
    {
      tKey: "sidebar.menu.menu",
      langCodes: {
        "zh-CN": "菜单",
        "en-US": "Menus",
      },
    },
    {
      tKey: "sidebar.menu.system.permission.emptyPrompt",
      langCodes: {
        "zh-CN": "权限列表为空，请联系管理员分配权限",
        "en-US":
          "The permission list is empty. Please contact the administrator to assign it.",
      },
    },
    {
      tKey: "sidebar.menu.system.permission",
      langCodes: {
        "zh-CN": "权限",
        "en-US": "Permissions",
      },
    },
    {
      tKey: "sidebar.menu.system.rolePermission",
      langCodes: {
        "zh-CN": "角色权限",
        "en-US": "Role Permission",
      },
    },
    {
      tKey: "sidebar.menu.i18n",
      langCodes: {
        "zh-CN": "国际化",
        "en-US": "Internationalization",
      },
    },
    {
      tKey: "sidebar.menu.data.schemaForm",
      langCodes: {
        "zh-CN": "动态表单",
        "en-US": "Schema Form",
      },
    },
    {
      tKey: "sidebar.menu.data.schemaFormData",
      langCodes: {
        "zh-CN": "表单数据",
        "en-US": "Schema Form Data",
      },
    },
    {
      tKey: "sidebar.menu.language",
      langCodes: {
        "zh-CN": "语言",
        "en-US": "Languages",
      },
    },
    {
      tKey: "sidebar.menu.translation",
      langCodes: {
        "zh-CN": "翻译",
        "en-US": "Translations",
      },
    },
    {
      tKey: "sidebar.menu.i18n.region",
      langCodes: {
        "zh-CN": "国家地区",
        "en-US": "Regions",
      },
    },
    {
      tKey: "sidebar.menu.enterprise",
      langCodes: {
        "zh-CN": "企业管理",
        "en-US": "Enterprise",
      },
    },
    {
      tKey: "sidebar.menu.enterprise.mail",
      langCodes: {
        "zh-CN": "企业邮件",
        "en-US": "Mail",
      },
    },
    {
      tKey: "sidebar.menu.enterprise.mail.edm",
      langCodes: {
        "zh-CN": "EDM群发",
        "en-US": "EDM",
      },
    },
    {
      tKey: "sidebar.menu.enterprise.attendance",
      langCodes: {
        "zh-CN": "考勤管理",
        "en-US": "Attendance",
      },
    },
    {
      tKey: "sidebar.menu.personal.health",
      langCodes: {
        "zh-CN": "健康与医疗",
        "en-US": "Health & Medical",
      },
    },
    {
      tKey: "sidebar.menu.personal.finance",
      langCodes: {
        "zh-CN": "收入状况",
        "en-US": "Income & Finance",
      },
    },
    {
      tKey: "sidebar.menu.personal.family",
      langCodes: {
        "zh-CN": "家庭成员",
        "en-US": "Family Members",
      },
    },
    {
      tKey: "sidebar.menu.personal.social",
      langCodes: {
        "zh-CN": "社交圈子",
        "en-US": "Social Network",
      },
    },
    {
      tKey: "sidebar.menu.maintenance",
      langCodes: {
        "zh-CN": "运维",
        "en-US": "Maintenance",
      },
    },
    {
      tKey: "sidebar.menu.maintenance.cache",
      langCodes: {
        "zh-CN": "缓存",
        "en-US": "Cache",
      },
    },
    {
      tKey: "sidebar.menu.maintenance.openapi",
      langCodes: {
        "zh-CN": "接口文档",
        "en-US": "API Docs",
      },
    },
    {
      tKey: "sidebar.menu.maintenance.apiDocs",
      langCodes: {
        "zh-CN": "API 文档",
        "en-US": "API Docs",
      },
    },
    {
      tKey: "businessType.maintenance.api_docs",
      langCodes: {
        "zh-CN": "系统运维-API文档管理",
        "en-US": "Maintenance-API Docs",
      },
    },
    {
      tKey: "businessType.admin.system",
      langCodes: { "zh-CN": "系统管理", "en-US": "System" },
    },
    {
      tKey: "businessType.admin.system.user",
      langCodes: { "zh-CN": "用户管理", "en-US": "User" },
    },
    {
      tKey: "businessType.admin.system.role",
      langCodes: { "zh-CN": "角色管理", "en-US": "Role" },
    },
    {
      tKey: "businessType.admin.system.permission",
      langCodes: { "zh-CN": "权限管理", "en-US": "Permission" },
    },
    {
      tKey: "businessType.admin.system.department",
      langCodes: { "zh-CN": "部门管理", "en-US": "Department" },
    },
    {
      tKey: "businessType.admin.system.menu",
      langCodes: { "zh-CN": "菜单管理", "en-US": "Menu" },
    },
    {
      tKey: "businessType.admin.system.role_permission",
      langCodes: { "zh-CN": "角色权限管理", "en-US": "Role Permission" },
    },
    {
      tKey: "businessType.admin.system.auth",
      langCodes: { "zh-CN": "个人信息", "en-US": "Profile" },
    },
    {
      tKey: "businessType.admin.mail",
      langCodes: { "zh-CN": "邮件管理", "en-US": "Mail Management" },
    },
    {
      tKey: "businessType.admin.mail.account",
      langCodes: { "zh-CN": "邮件账户", "en-US": "Mail Account" },
    },
    {
      tKey: "businessType.admin.mail.template",
      langCodes: { "zh-CN": "邮件模板", "en-US": "Mail Template" },
    },
    {
      tKey: "businessType.admin.mail.log",
      langCodes: { "zh-CN": "邮件日志", "en-US": "Mail Log" },
    },
    {
      tKey: "businessType.admin.mail.action",
      langCodes: { "zh-CN": "邮件操作", "en-US": "Mail Action" },
    },
    {
      tKey: "businessType.admin.i18n",
      langCodes: { "zh-CN": "国际化管理", "en-US": "Internationalization" },
    },
    {
      tKey: "businessType.admin.i18n.language",
      langCodes: { "zh-CN": "语言管理", "en-US": "Language" },
    },
    {
      tKey: "businessType.admin.i18n.region",
      langCodes: { "zh-CN": "地区管理", "en-US": "Region" },
    },
    {
      tKey: "businessType.admin.i18n.translation",
      langCodes: { "zh-CN": "翻译管理", "en-US": "Translation" },
    },
    {
      tKey: "businessType.admin.maintenance",
      langCodes: { "zh-CN": "系统运维", "en-US": "System Maintenance" },
    },
    {
      tKey: "businessType.admin.maintenance.cache",
      langCodes: { "zh-CN": "缓存管理", "en-US": "Cache" },
    },
    {
      tKey: "businessType.admin.maintenance.audit_login",
      langCodes: { "zh-CN": "登录日志", "en-US": "Login Audit" },
    },
    {
      tKey: "businessType.admin.maintenance.cron",
      langCodes: { "zh-CN": "定时任务", "en-US": "Scheduled Tasks" },
    },
    {
      tKey: "businessType.admin.maintenance.api_task",
      langCodes: { "zh-CN": "API采集任务", "en-US": "API Task" },
    },
    {
      tKey: "businessType.admin.maintenance.api_docs",
      langCodes: { "zh-CN": "API文档管理", "en-US": "API Docs" },
    },
    {
      tKey: "businessType.admin.maintenance.compliance",
      langCodes: { "zh-CN": "合规归档", "en-US": "Compliance Audit" },
    },
    {
      tKey: "businessType.admin.maintenance.init",
      langCodes: { "zh-CN": "初始化数据", "en-US": "Init Data" },
    },
    {
      tKey: "businessType.admin",
      langCodes: { "zh-CN": "管理后台", "en-US": "Admin Backend" },
    },
    {
      tKey: "businessType.admin.data",
      langCodes: { "zh-CN": "数据库", "en-US": "Database" },
    },
    {
      tKey: "businessType.admin.data.schema_form",
      langCodes: { "zh-CN": "动态表单", "en-US": "Schema Form" },
    },
    {
      tKey: "businessType.admin.data.schema_form_data",
      langCodes: { "zh-CN": "表单数据", "en-US": "Schema Form Data" },
    },
    {
      tKey: "businessType.admin.oss",
      langCodes: { "zh-CN": "对象存储", "en-US": "Object Storage" },
    },
    {
      tKey: "businessType.admin.oss.config",
      langCodes: { "zh-CN": "存储配置", "en-US": "Storage Config" },
    },
    {
      tKey: "businessType.admin.oss.file",
      langCodes: { "zh-CN": "文件管理", "en-US": "File Management" },
    },
    {
      tKey: "businessType.enterprise",
      langCodes: { "zh-CN": "企业管理", "en-US": "Enterprise" },
    },
    {
      tKey: "businessType.enterprise.mail",
      langCodes: { "zh-CN": "企业邮件", "en-US": "Enterprise Mail" },
    },
    {
      tKey: "businessType.enterprise.mail.edm",
      langCodes: { "zh-CN": "EDM群发", "en-US": "EDM" },
    },
    {
      tKey: "businessType.organization",
      langCodes: { "zh-CN": "组织管理", "en-US": "Organization" },
    },
    {
      tKey: "businessType.organization.attendance",
      langCodes: { "zh-CN": "考勤管理", "en-US": "Attendance" },
    },
    {
      tKey: "businessType.executive",
      langCodes: { "zh-CN": "事务管理", "en-US": "Executive" },
    },
    {
      tKey: "businessType.executive.workflow",
      langCodes: { "zh-CN": "工作流编排", "en-US": "Workflow" },
    },
    {
      tKey: "businessType.personal",
      langCodes: { "zh-CN": "个人中心", "en-US": "Personal" },
    },
    {
      tKey: "businessType.personal.profile",
      langCodes: { "zh-CN": "个人信息", "en-US": "Personal Profile" },
    },
    {
      tKey: "businessType.personal.mail",
      langCodes: { "zh-CN": "个人邮件", "en-US": "Personal Mail" },
    },
    {
      tKey: "businessType.personal.mail.preference",
      langCodes: { "zh-CN": "邮件偏好", "en-US": "Preference" },
    },
    {
      tKey: "businessType.admin.rpa",
      langCodes: { "zh-CN": "RPA", "en-US": "RPA" },
    },
    {
      tKey: "businessType.admin.rpa.browser",
      langCodes: { "zh-CN": "RPA-浏览器配置", "en-US": "RPA-Browser Config" },
    },
    {
      tKey: "businessType.admin.ai",
      langCodes: { "zh-CN": "AI", "en-US": "AI" },
    },
    {
      tKey: "businessType.admin.ai.config",
      langCodes: { "zh-CN": "AI配置", "en-US": "AI Config" },
    },
    {
      tKey: "businessType.admin.ai.chat",
      langCodes: { "zh-CN": "AI对话", "en-US": "AI Chat" },
    },
    {
      tKey: "businessType.admin.swarm",
      langCodes: { "zh-CN": "Swarm集群", "en-US": "Swarm Cluster" },
    },
    {
      tKey: "businessType.admin.swarm.docker",
      langCodes: { "zh-CN": "Docker服务", "en-US": "Docker Service" },
    },
    {
      tKey: "businessType.admin.swarm.docker_config",
      langCodes: { "zh-CN": "Docker配置", "en-US": "Docker Config" },
    },
    {
      tKey: "businessType.admin.swarm.nodes",
      langCodes: { "zh-CN": "节点管理", "en-US": "Node Management" },
    },
  ],
  components: [
    {
      tKey: "table.deleteConfirm",
      langCodes: {
        "zh-CN": "确定要删除吗？此操作不可撤销。",
        "en-US":
          "Are you sure you want to delete it? This action cannot be undone.",
      },
    },
    {
      tKey: "filter.results",
      langCodes: {
        "zh-CN": "{count} 个结果",
        "en-US": "{count} results",
      },
    },
    {
      tKey: "form.pleaseEnter",
      langCodes: {
        "zh-CN": "请输入",
        "en-US": "Please Enter",
      },
    },
    {
      tKey: "form.select",
      langCodes: {
        "zh-CN": "请选择",
        "en-US": "Please Select",
      },
    },
    {
      tKey: "status.success",
      langCodes: {
        "zh-CN": "成功",
        "en-US": "Success",
      },
    },
    {
      tKey: "status.failure",
      langCodes: {
        "zh-CN": "失败",
        "en-US": "Failure",
      },
    },
    {
      tKey: "table.refresh",
      langCodes: {
        "zh-CN": "刷新",
        "en-US": "Refresh",
      },
    },
    {
      tKey: "status.enabled",
      langCodes: {
        "zh-CN": "启用",
        "en-US": "Enabled",
      },
    },
    {
      tKey: "status.disabled",
      langCodes: {
        "zh-CN": "禁用",
        "en-US": "Disabled",
      },
    },
    {
      tKey: "dialog.cancel",
      langCodes: {
        "zh-CN": "取消",
        "en-US": "Cancel",
      },
    },
    {
      tKey: "table.pageSizeLabel",
      langCodes: {
        "zh-CN": "每页条数",
        "en-US": "Items per page",
      },
    },
    {
      tKey: "column.noData",
      langCodes: {
        "zh-CN": "暂无数据",
        "en-US": "No data",
      },
    },
    {
      tKey: "column.language",
      langCodes: {
        "zh-CN": "语言",
        "en-US": "Language",
      },
    },
    {
      tKey: "column.category",
      langCodes: {
        "zh-CN": "分类",
        "en-US": "Category",
      },
    },
    {
      tKey: "dialog.close",
      langCodes: {
        "zh-CN": "关闭",
        "en-US": "Close",
      },
    },
    {
      tKey: "columns.id",
      langCodes: {
        "zh-CN": "ID",
        "en-US": "ID",
      },
    },
    {
      tKey: "columns.status",
      langCodes: {
        "zh-CN": "状态",
        "en-US": "Status",
      },
    },
    {
      tKey: "columns.createTime",
      langCodes: {
        "zh-CN": "创建时间",
        "en-US": "Create Time",
      },
    },
    {
      tKey: "columns.updateTime",
      langCodes: {
        "zh-CN": "更新时间",
        "en-US": "Update Time",
      },
    },
    {
      tKey: "columns.permissionCount",
      langCodes: {
        "zh-CN": "权限数量",
        "en-US": "Permission Count",
      },
    },
    {
      tKey: "table.actions",
      langCodes: {
        "zh-CN": "操作",
        "en-US": "Actions",
      },
    },
    {
      tKey: "dialog.add",
      langCodes: {
        "zh-CN": "新增",
        "en-US": "Add",
      },
    },
    {
      tKey: "dialog.edit",
      langCodes: {
        "zh-CN": "编辑",
        "en-US": "Edit",
      },
    },
    {
      tKey: "dialog.delete",
      langCodes: {
        "zh-CN": "删除",
        "en-US": "Delete",
      },
    },
    {
      tKey: "dialog.save",
      langCodes: {
        "zh-CN": "保存",
        "en-US": "Save",
      },
    },
    {
      tKey: "dialog.confirm",
      langCodes: {
        "zh-CN": "确定",
        "en-US": "Confirm",
      },
    },
    {
      tKey: "dialog.confirmContent",
      langCodes: {
        "zh-CN": "确定要保存当前权限变更吗？",
        "en-US":
          "Are you sure you want to save the current permission changes?",
      },
    },
    {
      tKey: "dialog.operationSuccess",
      langCodes: {
        "zh-CN": "操作成功",
        "en-US": "Operation successful",
      },
    },
    {
      tKey: "column.yes",
      langCodes: {
        "zh-CN": "是",
        "en-US": "Yes",
      },
    },
    {
      tKey: "column.no",
      langCodes: {
        "zh-CN": "否",
        "en-US": "No",
      },
    },
    {
      tKey: "dialog.deleteConfirmTitle",
      langCodes: {
        "zh-CN": "确认删除",
        "en-US": "Confirm Delete",
      },
    },
    {
      tKey: "filter.title",
      langCodes: {
        "zh-CN": "搜索与筛选",
        "en-US": "Search & Filter",
      },
    },
    {
      tKey: "filter.clear",
      langCodes: {
        "zh-CN": "清除筛选",
        "en-US": "Clear Filters",
      },
    },
    {
      tKey: "filter.keywordLabel",
      langCodes: {
        "zh-CN": "关键字搜索",
        "en-US": "Keyword Search",
      },
    },
    {
      tKey: "filter.orderBy",
      langCodes: {
        "zh-CN": "排序字段",
        "en-US": "Sort By",
      },
    },
    {
      tKey: "filter.sortOrder",
      langCodes: {
        "zh-CN": "排序方式",
        "en-US": "Sort Order",
      },
    },
    {
      tKey: "filter.asc",
      langCodes: {
        "zh-CN": "升序",
        "en-US": "Ascending",
      },
    },
    {
      tKey: "filter.desc",
      langCodes: {
        "zh-CN": "降序",
        "en-US": "Descending",
      },
    },
    {
      tKey: "column.unassigned",
      langCodes: {
        "zh-CN": "未分配",
        "en-US": "Unassigned",
      },
    },
    {
      tKey: "columns.name",
      langCodes: {
        "zh-CN": "名称",
        "en-US": "Name",
      },
    },
    {
      tKey: "column.remark",
      langCodes: {
        "zh-CN": "备注",
        "en-US": "Remark",
      },
    },
    {
      tKey: "filter.keyword",
      langCodes: {
        "zh-CN": "关键词",
        "en-US": "Keyword",
      },
    },
    {
      tKey: "search.keyword",
      langCodes: {
        "zh-CN": "关键词",
        "en-US": "Keyword",
      },
    },
    {
      tKey: "filter.enabledStatus",
      langCodes: {
        "zh-CN": "启用状态",
        "en-US": "Enabled Status",
      },
    },
    {
      tKey: "filter.all",
      langCodes: {
        "zh-CN": "全部",
        "en-US": "All",
      },
    },
    {
      tKey: "filter.condition",
      langCodes: {
        "zh-CN": "筛选条件",
        "en-US": "Filter Conditions",
      },
    },
    {
      tKey: "dialog.required",
      langCodes: {
        "zh-CN": "该项为必填项",
        "en-US": "This field is required",
      },
    },
    {
      tKey: "page.details",
      langCodes: {
        "zh-CN": "详情",
        "en-US": "Details",
      },
    },
    {
      tKey: "dialog.titie.error",
      langCodes: {
        "zh-CN": "错误提示",
        "en-US": "Error",
      },
    },
    {
      tKey: "dialog.titie.warning",
      langCodes: {
        "zh-CN": "警告",
        "en-US": "Warning",
      },
    },
    {
      tKey: "dialog.titie.success",
      langCodes: {
        "zh-CN": "成功",
        "en-US": "Success",
      },
    },
    {
      tKey: "dialog.titie.info",
      langCodes: {
        "zh-CN": "提示",
        "en-US": "Info",
      },
    },
    {
      tKey: "common.saving",
      langCodes: {
        "zh-CN": "保存中",
        "en-US": "Saving",
      },
    },
    {
      tKey: "common.collapseAll",
      langCodes: {
        "zh-CN": "折叠所有",
        "en-US": "Collapse All",
      },
    },
    {
      tKey: "common.expandAll",
      langCodes: {
        "zh-CN": "展开所有",
        "en-US": "Expand All",
      },
    },
    {
      tKey: "common.filter",
      langCodes: {
        "zh-CN": "筛选",
        "en-US": "Filter",
      },
    },
    {
      tKey: "common.results",
      langCodes: {
        "zh-CN": "个结果",
        "en-US": "results",
      },
    },
    {
      tKey: "common.searching",
      langCodes: {
        "zh-CN": "搜索中...",
        "en-US": "Searching...",
      },
    },
    {
      tKey: "common.permanent",
      langCodes: {
        "zh-CN": "永久",
        "en-US": "Permanent",
      },
    },
    {
      tKey: "common.view",
      langCodes: {
        "zh-CN": "查看",
        "en-US": "View",
      },
    },
    {
      tKey: "common.edit",
      langCodes: {
        "zh-CN": "编辑",
        "en-US": "Edit",
      },
    },
    {
      tKey: "common.delete",
      langCodes: {
        "zh-CN": "删除",
        "en-US": "Delete",
      },
    },
    {
      tKey: "common.cancel",
      langCodes: {
        "zh-CN": "取消",
        "en-US": "Cancel",
      },
    },
    {
      tKey: "common.submit",
      langCodes: {
        "zh-CN": "提交",
        "en-US": "Submit",
      },
    },
    {
      tKey: "common.submitting",
      langCodes: {
        "zh-CN": "提交中...",
        "en-US": "Submitting...",
      },
    },
    {
      tKey: "common.loading",
      langCodes: {
        "zh-CN": "加载中...",
        "en-US": "Loading...",
      },
    },
    {
      tKey: "common.loadMore",
      langCodes: {
        "zh-CN": "加载更多",
        "en-US": "Load More",
      },
    },
    {
      tKey: "common.deleting",
      langCodes: {
        "zh-CN": "删除中...",
        "en-US": "Deleting...",
      },
    },
    {
      tKey: "common.confirmDelete",
      langCodes: {
        "zh-CN": "确认删除",
        "en-US": "Confirm Delete",
      },
    },
    {
      tKey: "common.isEnabled",
      langCodes: {
        "zh-CN": "是否启用",
        "en-US": "Is Enabled",
      },
    },
    {
      tKey: "columns.actions",
      langCodes: {
        "zh-CN": "操作",
        "en-US": "Actions",
      },
    },
    {
      tKey: "column.creatorName",
      langCodes: {
        "zh-CN": "创建人",
        "en-US": "Creator",
      },
    },
    {
      tKey: "column.updaterName",
      langCodes: {
        "zh-CN": "修改人",
        "en-US": "Updater",
      },
    },
    {
      tKey: "pagination.prev",
      langCodes: {
        "zh-CN": "上一页",
        "en-US": "Previous",
      },
    },
    {
      tKey: "pagination.next",
      langCodes: {
        "zh-CN": "下一页",
        "en-US": "Next",
      },
    },
  ],
  common: [
    {
      tKey: "log.namespace",
      langCodes: {
        "zh-CN": "命名空间",
        "en-US": "Namespace",
      },
    },
    {
      tKey: "log.logLevel",
      langCodes: {
        "zh-CN": "日志级别",
        "en-US": "Log Level",
      },
    },
    {
      tKey: "log.payloadType",
      langCodes: {
        "zh-CN": "数据格式",
        "en-US": "Payload Type",
      },
    },
    {
      tKey: "log.beforeData",
      langCodes: {
        "zh-CN": "变更前数据",
        "en-US": "Before Data",
      },
    },
    {
      tKey: "log.afterData",
      langCodes: {
        "zh-CN": "变更后数据",
        "en-US": "After Data",
      },
    },
    {
      tKey: "log.content",
      langCodes: {
        "zh-CN": "内容",
        "en-US": "Content",
      },
    },
    {
      tKey: "log.sysLog",
      langCodes: {
        "zh-CN": "系统日志 (Sys)",
        "en-US": "System Logs",
      },
    },
    {
      tKey: "log.auditLog",
      langCodes: {
        "zh-CN": "审计日志 (Audit)",
        "en-US": "Audit Logs",
      },
    },
    {
      tKey: "log.bizLog",
      langCodes: {
        "zh-CN": "业务日志 (Biz)",
        "en-US": "Business Logs",
      },
    },
    {
      tKey: "log.globalTimeline",
      langCodes: {
        "zh-CN": "全局时间线 (Timeline)",
        "en-US": "Global Timeline",
      },
    },
    {
      tKey: "common.fullScreen",
      langCodes: {
        "zh-CN": "全屏",
        "en-US": "Full Screen",
      },
    },
    {
      tKey: "common.exitFullScreen",
      langCodes: {
        "zh-CN": "退出全屏",
        "en-US": "Exit Full Screen",
      },
    },
    {
      tKey: "common.refresh",
      langCodes: {
        "zh-CN": "刷新",
        "en-US": "Refresh",
      },
    },
    {
      tKey: "common.welcome",
      langCodes: {
        "zh-CN": "欢迎使用管理系统",
        "en-US": "Welcome to the Management System",
      },
    },
    {
      tKey: "common.welcomeSubtitle",
      langCodes: {
        "zh-CN": "提供高效便捷的工作流与组织管理方案",
        "en-US":
          "Efficient workflows and organizational management solutions at your fingertips.",
      },
    },
  ],
  "business.exception": [
    {
      application: "backend",
      tKey: "errorHandler.databaseBusy",
      langCodes: {
        "zh-CN": "数据库繁忙或锁定",
        "en-US": "Database busy or locked",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.databaseError",
      langCodes: {
        "zh-CN": "数据库操作错误",
        "en-US": "Database operation error",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.dockerApiError",
      langCodes: {
        "zh-CN": "Docker API 调用失败",
        "en-US": "Docker API call failed",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.notFound",
      langCodes: {
        "zh-CN": "未找到请求的资源",
        "en-US": "Resource not found",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.targetNotExist",
      langCodes: {
        "zh-CN": "目标不存在",
        "en-US": "Target does not exist",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.forbidden",
      langCodes: {
        "zh-CN": "禁止访问",
        "en-US": "Access forbidden",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.permissionDenied",
      langCodes: {
        "zh-CN": "权限不足",
        "en-US": "Permission denied",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.validationFailed",
      langCodes: {
        "zh-CN": "请求校验失败",
        "en-US": "Request validation failed",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.serverError",
      langCodes: {
        "zh-CN": "服务器异常",
        "en-US": "Server error",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.unknownError",
      langCodes: {
        "zh-CN": "未知异常",
        "en-US": "Unknown error",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.undefinedError",
      langCodes: {
        "zh-CN": "未定义的错误类型",
        "en-US": "Undefined error type",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.duplicatedData",
      langCodes: {
        "zh-CN": "数据重复",
        "en-US": "Duplicated data",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.invalidParams",
      langCodes: {
        "zh-CN": "无效的参数",
        "en-US": "Invalid parameters",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.departmentNotExist",
      langCodes: {
        "zh-CN": "部门不存在或已被禁用",
        "en-US": "Department does not exist or has been disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.roleNotExist",
      langCodes: {
        "zh-CN": "角色不存在或已被禁用",
        "en-US": "Role does not exist or has been disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.role.superAdminDeleteProhibited",
      langCodes: {
        "zh-CN": "超级管理员角色禁止删除",
        "en-US": "Super admin role cannot be deleted",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.role.superAdminUpdateProhibited",
      langCodes: {
        "zh-CN": "超级管理员角色核心属性禁止修改",
        "en-US": "Core attributes of super admin role cannot be modified",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.user.superAdminDeleteProhibited",
      langCodes: {
        "zh-CN": "超级管理员用户禁止删除",
        "en-US": "Super admin user cannot be deleted",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.user.superAdminDisableProhibited",
      langCodes: {
        "zh-CN": "超级管理员用户禁止禁用",
        "en-US": "Super admin user cannot be disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.system.user.assignSuperAdminRoleProhibited",
      langCodes: {
        "zh-CN": "禁止分配超级管理员角色",
        "en-US": "Assigning super admin role is prohibited",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.hasChildren",
      langCodes: {
        "zh-CN": "存在子节点，请检查后重试",
        "en-US": "Child nodes exist, please check and try again",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.departmentHasEnabledUser",
      langCodes: {
        "zh-CN": "当前部门或子部门下存在已启用的用户，无法禁用",
        "en-US":
          "Cannot disable department: active users exist in current or child departments",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.checkOutTimeEarly",
      langCodes: {
        "zh-CN": "签退时间早于或等于签到时间",
        "en-US":
          "Check-out time cannot be earlier than or equal to check-in time",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.departmentHasEnabledChildren",
      langCodes: {
        "zh-CN": "当前部门下存在未禁用的子部门，请先禁用子部门",
        "en-US":
          "Cannot disable department: enabled child departments exist, please disable them first",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.selfParent",
      langCodes: {
        "zh-CN": "不能将部门自身设为父部门",
        "en-US": "A department cannot be its own parent",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.department.descendantParent",
      langCodes: {
        "zh-CN": "不能将子孙部门设为父部门，会导致死循环",
        "en-US":
          "A descendant department cannot be set as a parent, it would cause a circular reference",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.notAuthenticated",
      langCodes: {
        "zh-CN": "用户未认证或token无效",
        "en-US": "User not authenticated or token is invalid",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.notExistOrDisabled",
      langCodes: {
        "zh-CN": "数据不存在或已被禁用",
        "en-US": "Data does not exist or has been disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.menu.parentNotExist",
      langCodes: {
        "zh-CN": "父菜单不存在或已被禁用",
        "en-US": "Parent menu does not exist or has been disabled",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.menu.selfParent",
      langCodes: {
        "zh-CN": "父菜单不能是自己",
        "en-US": "Parent menu cannot be itself",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.menu.circularParent",
      langCodes: {
        "zh-CN": "不能将子孙菜单设为父菜单，会导致环路",
        "en-US":
          "Cannot set descendant menu as parent, it causes a circular loop",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.menu.hasChildren",
      langCodes: {
        "zh-CN": "该菜单下存在子菜单，无法直接删除",
        "en-US": "Sub-menus exist, cannot delete",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.menu.hasEnabledChildren",
      langCodes: {
        "zh-CN": "该菜单下存在已启用的子菜单，请先禁用子菜单",
        "en-US": "Enabled sub-menus exist, please disable them first",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.notYetImplemented",
      langCodes: {
        "zh-CN": "功能暂未实现",
        "en-US": "Feature not yet implemented",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.wrongPassword",
      langCodes: {
        "zh-CN": "密码错误",
        "en-US": "Invalid password",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.loginFailed",
      langCodes: {
        "zh-CN": "登录失败，请检查用户名和密码",
        "en-US": "Login failed, please check username and password",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.mail.action.sendFailed",
      langCodes: {
        "zh-CN": "邮件发送失败，请检查配置或网络连接",
        "en-US":
          "Mail sending failed, please check configuration or network connection",
      },
    },
    {
      tKey: "error.requestFailed",
      langCodes: {
        "zh-CN": "请求失败",
        "en-US": "Request failed",
      },
    },
    {
      tKey: "error.sessionExpired",
      langCodes: {
        "zh-CN": "登录已过期，请重新登录",
        "en-US": "Session expired, please login again",
      },
    },
    {
      tKey: "error.networkError",
      langCodes: {
        "zh-CN": "网络错误",
        "en-US": "Network error",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.i18n.language.duplicateLangCode",
      langCodes: {
        "zh-CN": "该语言代码已存在",
        "en-US": "Language code already exists",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.i18n.region.duplicateCode",
      langCodes: {
        "zh-CN": "该国家/地区代码已存在（alpha2、alpha3 或 numeric 重复）",
        "en-US":
          "Region code already exists (duplicate alpha2, alpha3, or numeric)",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.i18n.translation.duplicateTKey",
      langCodes: {
        "zh-CN": "该翻译键在同一语言下已存在",
        "en-US": "Translation key already exists for this language",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.oss.config.duplicateName",
      langCodes: {
        "zh-CN": "存储配置名称已存在",
        "en-US": "OSS configuration name already exists",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.oss.config.initFailed",
      langCodes: {
        "zh-CN": "无法初始化存储实例，请检查配置信息或运行环境",
        "en-US":
          "Failed to initialize storage instance. Please check configuration or environment.",
      },
    },
    {
      tKey: "gender.male",
      langCodes: {
        "zh-CN": "男",
        "en-US": "Male",
      },
    },
    {
      tKey: "gender.female",
      langCodes: {
        "zh-CN": "女",
        "en-US": "Female",
      },
    },
    {
      tKey: "mail.scope",
      langCodes: {
        "zh-CN": "作用域",
        "en-US": "Scope",
      },
    },
    {
      tKey: "mail.scope.sys",
      langCodes: {
        "zh-CN": "系统级",
        "en-US": "System",
      },
    },
    {
      tKey: "mail.scope.biz",
      langCodes: {
        "zh-CN": "企业级",
        "en-US": "Enterprise",
      },
    },
    {
      tKey: "mail.scope.user",
      langCodes: {
        "zh-CN": "个人级",
        "en-US": "Personal",
      },
    },
  ],
} satisfies Record<
  Extract<
    BusinessKey,
    "business.type" | "components" | "common" | "business.exception"
  >,
  TranslationInputItem[]
>;

export const actionTranslations = {
  read: {
    "zh-CN": "查看",
    "en-US": "View",
  },
  list: {
    "zh-CN": "列表",
    "en-US": "List",
  },
  add: {
    "zh-CN": "新增",
    "en-US": "Add",
  },
  edit: {
    "zh-CN": "编辑",
    "en-US": "Edit",
  },
  delete: {
    "zh-CN": "删除",
    "en-US": "Delete",
  },
  export: {
    "zh-CN": "导出",
    "en-US": "Export",
  },
  view: {
    "zh-CN": "浏览",
    "en-US": "View",
  },
  "batch-delete": {
    "zh-CN": "批量删除",
    "en-US": "Batch Delete",
  },
  unknown: {
    "zh-CN": "未知动作",
    "en-US": "Unknown Action",
  },
} as const;
