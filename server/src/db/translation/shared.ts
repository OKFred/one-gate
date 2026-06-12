import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const sharedTranslations = {
  "business.type": [
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
      tKey: "sidebar.menu.ai.config",
      langCodes: {
        "zh-CN": "LLM 配置",
        "en-US": "LLM Configuration",
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
        "zh-CN": "我的",
        "en-US": "Profile",
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
      tKey: "sidebar.menu.system.schemaForm",
      langCodes: {
        "zh-CN": "动态表单配置",
        "en-US": "Schema Form Config",
      },
    },
    {
      tKey: "sidebar.menu.system.schemaFormData",
      langCodes: {
        "zh-CN": "表单提交数据",
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
      tKey: "sidebar.menu.enterprise.attendance",
      langCodes: {
        "zh-CN": "考勤管理",
        "en-US": "Attendance",
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
  ],
  common: [
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
  ],
  "infra.businessType": [
    {
      tKey: "businessType.i18n",
      langCodes: {
        "zh-CN": "国际化",
        "en-US": "Internationalization",
      },
    },
    {
      tKey: "businessType.i18n.language",
      langCodes: {
        "zh-CN": "国际化语言",
        "en-US": "Internationalization Language",
      },
    },
    {
      tKey: "businessType.i18n.region",
      langCodes: {
        "zh-CN": "国际化地区",
        "en-US": "Internationalization Region",
      },
    },
    {
      tKey: "businessType.i18n.translation",
      langCodes: {
        "zh-CN": "国际化翻译",
        "en-US": "Internationalization Translation",
      },
    },
    {
      tKey: "businessType.mail",
      langCodes: {
        "zh-CN": "邮件",
        "en-US": "Mail",
      },
    },
    {
      tKey: "businessType.mail.account",
      langCodes: {
        "zh-CN": "邮件账户",
        "en-US": "Mail Account",
      },
    },
    {
      tKey: "businessType.mail.template",
      langCodes: {
        "zh-CN": "邮件模板",
        "en-US": "Mail Template",
      },
    },
    {
      tKey: "businessType.mail.action",
      langCodes: {
        "zh-CN": "邮件操作",
        "en-US": "Mail Action",
      },
    },
    {
      tKey: "businessType.mail.log",
      langCodes: {
        "zh-CN": "邮件日志",
        "en-US": "Mail Log",
      },
    },
    {
      tKey: "businessType.maintenance",
      langCodes: {
        "zh-CN": "运维",
        "en-US": "Operation Maintenance",
      },
    },
    {
      tKey: "businessType.maintenance.cache",
      langCodes: {
        "zh-CN": "运维缓存",
        "en-US": "Operation Maintenance Cache",
      },
    },
    {
      tKey: "businessType.maintenance.compliance",
      langCodes: {
        "zh-CN": "运维合规",
        "en-US": "Operation Maintenance Compliance",
      },
    },
    {
      tKey: "businessType.system",
      langCodes: {
        "zh-CN": "系统",
        "en-US": "System",
      },
    },
    {
      tKey: "businessType.system.auth",
      langCodes: {
        "zh-CN": "系统鉴权",
        "en-US": "System Auth",
      },
    },
    {
      tKey: "businessType.system.department",
      langCodes: {
        "zh-CN": "系统部门",
        "en-US": "System Department",
      },
    },
    {
      tKey: "businessType.system.menu",
      langCodes: {
        "zh-CN": "系统菜单",
        "en-US": "System Menu",
      },
    },
    {
      tKey: "businessType.system.permission",
      langCodes: {
        "zh-CN": "系统权限",
        "en-US": "System Permission",
      },
    },
    {
      tKey: "businessType.system.role",
      langCodes: {
        "zh-CN": "系统角色",
        "en-US": "System Role",
      },
    },
    {
      tKey: "businessType.system.role_permission",
      langCodes: {
        "zh-CN": "系统角色权限",
        "en-US": "System Role Permission",
      },
    },
    {
      tKey: "businessType.system.user",
      langCodes: {
        "zh-CN": "系统用户",
        "en-US": "System User",
      },
    },
    {
      tKey: "businessType.oss",
      langCodes: {
        "zh-CN": "对象存储",
        "en-US": "Object Storage",
      },
    },
    {
      tKey: "businessType.oss.config",
      langCodes: {
        "zh-CN": "存储配置",
        "en-US": "OSS Config",
      },
    },
    {
      tKey: "businessType.oss.file",
      langCodes: {
        "zh-CN": "文件管理",
        "en-US": "File Management",
      },
    },
    {
      tKey: "businessType.enterprise",
      langCodes: {
        "zh-CN": "企业管理",
        "en-US": "Enterprise",
      },
    },
    {
      tKey: "businessType.enterprise.attendance",
      langCodes: {
        "zh-CN": "考勤管理",
        "en-US": "Attendance",
      },
    },
    {
      tKey: "businessType.swarm",
      langCodes: {
        "zh-CN": "Swarm集群",
        "en-US": "Swarm Cluster",
      },
    },
    {
      tKey: "businessType.swarm.docker",
      langCodes: {
        "zh-CN": "Docker服务",
        "en-US": "Docker Service",
      },
    },
    {
      tKey: "businessType.system.schema_form",
      langCodes: {
        "zh-CN": "动态表单配置",
        "en-US": "Schema Form Config",
      },
    },
    {
      tKey: "businessType.system.schema_form_data",
      langCodes: {
        "zh-CN": "表单提交数据",
        "en-US": "Schema Form Data",
      },
    },
    {
      tKey: "businessType.ai",
      langCodes: {
        "zh-CN": "AI",
        "en-US": "AI",
      },
    },
    {
      tKey: "businessType.ai.config",
      langCodes: {
        "zh-CN": "AI配置",
        "en-US": "AI Config",
      },
    },
    {
      tKey: "businessType.ai.chat",
      langCodes: {
        "zh-CN": "AI对话",
        "en-US": "AI Chat",
      },
    },
  ],
} satisfies Record<
  Extract<
    BusinessKey,
    | "business.type"
    | "components"
    | "common"
    | "business.exception"
    | "infra.businessType"
  >,
  TranslationInputItem[]
>;
