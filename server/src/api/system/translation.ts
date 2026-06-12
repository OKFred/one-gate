import type { TranslationInputItem } from "@/db/initTranslation";
import type { BusinessKey } from "@/types/business";

export const systemTranslations = {
  "system.auth": [
    {
      tKey: "form.missingCredentials",
      langCodes: {
        "zh-CN": "请输入用户名和密码",
        "en-US": "Please enter username and password",
      },
    },
    {
      tKey: "topbar.title",
      langCodes: {
        "zh-CN": "条条大道通罗马",
        "en-US": "All roads lead to Rome",
      },
    },
    {
      tKey: "topbar.profile",
      langCodes: {
        "zh-CN": "个人设置",
        "en-US": "Profile",
      },
    },
    {
      tKey: "topbar.logout",
      langCodes: {
        "zh-CN": "退出登录",
        "en-US": "Log out",
      },
    },
    {
      tKey: "topbar.notLoggedIn",
      langCodes: {
        "zh-CN": "未登录",
        "en-US": "Not signed in",
      },
    },
    {
      tKey: "login.username",
      langCodes: {
        "zh-CN": "用户名",
        "en-US": "Username",
      },
    },
    {
      tKey: "login.password",
      langCodes: {
        "zh-CN": "密码",
        "en-US": "Password",
      },
    },
    {
      tKey: "login.signIn",
      langCodes: {
        "zh-CN": "登录",
        "en-US": "Sign in",
      },
    },
    {
      tKey: "login.wechatSignIn",
      langCodes: {
        "zh-CN": "微信登录",
        "en-US": "WeChat Sign in",
      },
    },
    {
      tKey: "login.wechatWIP",
      langCodes: {
        "zh-CN": "微信登录功能正在开发中...",
        "en-US": "WeChat sign-in is under development...",
      },
    },
    {
      tKey: "login.forgotPassword",
      langCodes: {
        "zh-CN": "忘记密码？",
        "en-US": "Forgot password?",
      },
    },
    {
      tKey: "dialog.message",
      langCodes: {
        "zh-CN": "页面未找到",
        "en-US": "Page Not Found",
      },
    },
    {
      tKey: "dialog.goBackHome",
      langCodes: {
        "zh-CN": "返回首页",
        "en-US": "Go Back Home",
      },
    },
    {
      tKey: "home.title",
      langCodes: {
        "zh-CN": "欢迎使用",
        "en-US": "Welcome",
      },
    },
    {
      tKey: "home.subtitle",
      langCodes: {
        "zh-CN": "一站式信息管理解决方案",
        "en-US": "All-in-one information management solution",
      },
    },
    {
      tKey: "quickStart.accounts",
      langCodes: {
        "zh-CN": "邮件账户",
        "en-US": "Mail Accounts",
      },
    },
    {
      tKey: "quickStart.templates",
      langCodes: {
        "zh-CN": "邮件模板",
        "en-US": "Mail Templates",
      },
    },
    {
      tKey: "quickStart.todaySent",
      langCodes: {
        "zh-CN": "今日发送",
        "en-US": "Sent Today",
      },
    },
    {
      tKey: "quickStart.title",
      langCodes: {
        "zh-CN": "快速开始",
        "en-US": "Quick Start",
      },
    },
    {
      tKey: "quickStart.configureAccounts",
      langCodes: {
        "zh-CN": "🔧 配置邮件账户：在邮件账户管理中添加您的SMTP配置",
        "en-US":
          "🔧 Configure accounts: Add your SMTP settings in Mail Accounts",
      },
    },
    {
      tKey: "quickStart.createTemplate",
      langCodes: {
        "zh-CN": "📝 创建邮件模板：设计可重复使用的邮件模板",
        "en-US": "📝 Create templates: Design reusable mail templates",
      },
    },
    {
      tKey: "quickStart.sendMail",
      langCodes: {
        "zh-CN": "📧 发送邮件：使用模板快速发送邮件",
        "en-US": "📧 Send mail: Quickly send using templates",
      },
    },
    {
      tKey: "quickStart.viewLogs",
      langCodes: {
        "zh-CN": "📊 查看日志：监控邮件发送状态和历史记录",
        "en-US": "📊 View logs: Monitor mail send status and history",
      },
    },
    {
      tKey: "me.title",
      langCodes: {
        "zh-CN": "我的",
        "en-US": "My Profile",
      },
    },
    {
      tKey: "me.changePassword.title",
      langCodes: {
        "zh-CN": "修改密码",
        "en-US": "Change Password",
      },
    },
    {
      tKey: "me.changePassword.confirmPasswordRequired",
      langCodes: {
        "zh-CN": "确认密码必填",
        "en-US": "Confirm Password Required",
      },
    },
    {
      tKey: "me.table.currentPassword",
      langCodes: {
        "zh-CN": "当前密码",
        "en-US": "Current Password",
      },
    },
    {
      tKey: "me.table.newPassword",
      langCodes: {
        "zh-CN": "新密码",
        "en-US": "New Password",
      },
    },
    {
      tKey: "me.table.confirmPassword",
      langCodes: {
        "zh-CN": "确认新密码",
        "en-US": "Confirm New Password",
      },
    },
    {
      tKey: "me.subtitle",
      langCodes: {
        "zh-CN": "个人信息",
        "en-US": "Personal Information",
      },
    },
    {
      tKey: "me.region",
      langCodes: {
        "zh-CN": "国家/地区",
        "en-US": "Country/Region",
      },
    },
    {
      tKey: "me.department",
      langCodes: {
        "zh-CN": "部门",
        "en-US": "Department",
      },
    },
    {
      tKey: "me.role",
      langCodes: {
        "zh-CN": "角色",
        "en-US": "Role",
      },
    },
    {
      tKey: "me.accountStatus",
      langCodes: {
        "zh-CN": "账户状态",
        "en-US": "Account Status",
      },
    },
    {
      tKey: "me.changePassword.passwordFormatHint",
      langCodes: {
        "zh-CN": "密码长度7位~30位，至少包含一个字母和一个数字",
        "en-US":
          "Password length is from 7 to 30, and requires one word and one number at least",
      },
    },
    {
      tKey: "me.changePassword.sameAsOldPassword",
      langCodes: {
        "zh-CN": "新密码不能与当前密码相同",
        "en-US": "New password cannot be the same as current password",
      },
    },
    {
      tKey: "me.changePassword.passwordMismatch",
      langCodes: {
        "zh-CN": "新密码与确认密码不匹配",
        "en-US": "New password and confirm password do not match",
      },
    },
    {
      tKey: "me.changePassword.success",
      langCodes: {
        "zh-CN": "密码修改成功",
        "en-US": "Password changed successfully",
      },
    },
  ],
  "system.role_permission": [
    {
      tKey: "errorHandler.system.rolePermission.recordNotFound",
      langCodes: {
        "zh-CN": "角色权限记录不存在",
        "en-US": "Role permission record not found",
      },
    },
    {
      tKey: "errorHandler.system.rolePermission.roleNotFound",
      langCodes: {
        "zh-CN": "关联角色不存在",
        "en-US": "Associated role not found",
      },
    },
    {
      tKey: "errorHandler.system.rolePermission.permissionNotFound",
      langCodes: {
        "zh-CN": "关联权限不存在",
        "en-US": "Associated permission not found",
      },
    },
    {
      tKey: "rolePermission.title",
      langCodes: {
        "zh-CN": "角色权限管理",
        "en-US": "Role Permission Management",
      },
    },
    {
      tKey: "rolePermission.batchAdd",
      langCodes: {
        "zh-CN": "批量添加权限",
        "en-US": "Batch Add Permissions",
      },
    },
    {
      tKey: "rolePermission.selectRole",
      langCodes: {
        "zh-CN": "选择角色",
        "en-US": "Select Role",
      },
    },
    {
      tKey: "rolePermission.selectPermissions",
      langCodes: {
        "zh-CN": "选择权限",
        "en-US": "Select Permissions",
      },
    },
    {
      tKey: "rolePermission.availablePermissions",
      langCodes: {
        "zh-CN": "可用权限",
        "en-US": "Available Permissions",
      },
    },
    {
      tKey: "rolePermission.noAvailablePermissions",
      langCodes: {
        "zh-CN": "暂无可用权限",
        "en-US": "No Available Permissions",
      },
    },
    {
      tKey: "rolePermission.currentPermissions",
      langCodes: {
        "zh-CN": "当前权限",
        "en-US": "Current Permissions",
      },
    },
    {
      tKey: "rolePermission.assignedPermission",
      langCodes: {
        "zh-CN": "已分配权限",
        "en-US": "Assigned Permission",
      },
    },
    {
      tKey: "rolePermission.noPermissions",
      langCodes: {
        "zh-CN": "暂无权限",
        "en-US": "No Permissions",
      },
    },
    {
      tKey: "rolePermission.advancedSettings",
      langCodes: {
        "zh-CN": "高级设置",
        "en-US": "Advanced Settings",
      },
    },
    {
      tKey: "rolePermission.categoryFirst",
      langCodes: {
        "zh-CN": "类别优先",
        "en-US": "Category First",
      },
    },
    {
      tKey: "rolePermission.businessFirst",
      langCodes: {
        "zh-CN": "业务优先",
        "en-US": "Business First",
      },
    },
    {
      tKey: "rolePermission.otherCategory",
      langCodes: {
        "zh-CN": "其他",
        "en-US": "Other",
      },
    },
    {
      tKey: "rolePermission.keyword",
      langCodes: {
        "zh-CN": "关键词",
        "en-US": "Keyword",
      },
    },
    {
      tKey: "rolePermission.keywordPlaceholder",
      langCodes: {
        "zh-CN": "搜索角色或权限名称",
        "en-US": "Search role or permission name",
      },
    },
    {
      tKey: "rolePermission.filterByRole",
      langCodes: {
        "zh-CN": "按角色筛选",
        "en-US": "Filter by Role",
      },
    },
    {
      tKey: "rolePermission.filterByPermission",
      langCodes: {
        "zh-CN": "按权限筛选",
        "en-US": "Filter by Permission",
      },
    },
    {
      tKey: "rolePermission.batchDelete",
      langCodes: {
        "zh-CN": "批量删除",
        "en-US": "Batch Delete",
      },
    },
    {
      tKey: "rolePermission.confirmBatchDelete",
      langCodes: {
        "zh-CN": "确定要删除选中的 {count} 个角色权限关联吗？",
        "en-US":
          "Are you sure you want to delete the selected {count} role-permission associations?",
      },
    },
    {
      tKey: "rolePermission.selectedItems",
      langCodes: {
        "zh-CN": "选中项目",
        "en-US": "Selected Items",
      },
    },
    {
      tKey: "rolePermission.andMore",
      langCodes: {
        "zh-CN": "等 {count} 个",
        "en-US": "and {count} more",
      },
    },
    {
      tKey: "rolePermission.hasFilter",
      langCodes: {
        "zh-CN": "有过滤条件",
        "en-US": "Has Filter",
      },
    },
    {
      tKey: "rolePermission.hasConditions",
      langCodes: {
        "zh-CN": "有附加条件",
        "en-US": "Has Conditions",
      },
    },
    {
      tKey: "system.rolePermission.tree.selectRole",
      langCodes: {
        "zh-CN": "请先选择角色",
        "en-US": "Please select a role first",
      },
    },
  ],
  "system.user": [
    {
      tKey: "user.title",
      langCodes: {
        "zh-CN": "用户管理",
        "en-US": "User Management",
      },
    },
    {
      tKey: "user.table.password",
      langCodes: {
        "zh-CN": "密码",
        "en-US": "Password",
      },
    },
  ],
  "system.department": [
    {
      tKey: "department.title",
      langCodes: {
        "zh-CN": "部门管理",
        "en-US": "Department Management",
      },
    },
    {
      tKey: "department.table.name",
      langCodes: {
        "zh-CN": "名称",
        "en-US": "Name",
      },
    },
    {
      tKey: "department.table.managers",
      langCodes: {
        "zh-CN": "部门管理员",
        "en-US": "Department Managers",
      },
    },
    {
      tKey: "department.table.parentDepartment",
      langCodes: {
        "zh-CN": "上级部门",
        "en-US": "Parent Department",
      },
    },
    {
      tKey: "department.table.topLevelDepartment",
      langCodes: {
        "zh-CN": "无（顶级部门）",
        "en-US": "None (Top Level)",
      },
    },
    {
      tKey: "department.dialog.addChild",
      langCodes: {
        "zh-CN": "添加子部门",
        "en-US": "Add Sub-Department",
      },
    },
  ],
  "system.role": [
    {
      tKey: "role.table.roleName",
      langCodes: {
        "zh-CN": "角色名称",
        "en-US": "Role Name",
      },
    },
    {
      tKey: "role.table.permissions",
      langCodes: {
        "zh-CN": "权限列表",
        "en-US": "Permissions",
      },
    },
    {
      tKey: "role.table.permissionsHelper",
      langCodes: {
        "zh-CN": "权限列表为JSON数组格式",
        "en-US": "Permissions list in JSON array format",
      },
    },
    {
      tKey: "role.title",
      langCodes: {
        "zh-CN": "角色管理",
        "en-US": "Role Management",
      },
    },
    {
      tKey: "role.table.dataScope",
      langCodes: {
        "zh-CN": "数据范围",
        "en-US": "Data Scope",
      },
    },
    {
      tKey: "role.dataScope.all",
      langCodes: {
        "zh-CN": "全部数据",
        "en-US": "All Data",
      },
    },
    {
      tKey: "role.dataScope.dept_and_below",
      langCodes: {
        "zh-CN": "本部门及以下数据",
        "en-US": "Dept & Below Data",
      },
    },
    {
      tKey: "role.dataScope.self_only",
      langCodes: {
        "zh-CN": "仅本人数据",
        "en-US": "Self Only",
      },
    },
    {
      tKey: "role.dataScope.custom",
      langCodes: {
        "zh-CN": "自定义部门",
        "en-US": "Custom Departments",
      },
    },
    {
      tKey: "role.dataScope.customDeptIds",
      langCodes: {
        "zh-CN": "自定义部门ID",
        "en-US": "Custom Departments IDs",
      },
    },
  ],
  "system.menu": [
    {
      tKey: "menu.dialog.addSubMenu",
      langCodes: {
        "zh-CN": "添加子菜单",
        "en-US": "Add Sub-menu",
      },
    },
    {
      tKey: "menu.table.menuName",
      langCodes: {
        "zh-CN": "菜单名称",
        "en-US": "Menu Name",
      },
    },
    {
      tKey: "menu.table.customIcon",
      langCodes: {
        "zh-CN": "自定义图标 (Iconify格式)",
        "en-US": "Custom Icon (Iconify Format)",
      },
    },
    {
      tKey: "menu.table.iconHelper",
      langCodes: {
        "zh-CN": "例如: material-symbols:home",
        "en-US": "e.g., material-symbols:home",
      },
    },
    {
      tKey: "menu.table.routePath",
      langCodes: {
        "zh-CN": "路由路径",
        "en-US": "Route Path",
      },
    },
    {
      tKey: "menu.table.pathHelper",
      langCodes: {
        "zh-CN": "例如: /system/menu",
        "en-US": "e.g., /system/menu",
      },
    },
    {
      tKey: "menu.table.parentMenu",
      langCodes: {
        "zh-CN": "父菜单",
        "en-US": "Parent Menu",
      },
    },
    {
      tKey: "menu.table.topLevelMenu",
      langCodes: {
        "zh-CN": "无 (顶级菜单)",
        "en-US": "None (Top Level)",
      },
    },
    {
      tKey: "menu.table.sort",
      langCodes: {
        "zh-CN": "排序",
        "en-US": "Sort",
      },
    },
    {
      tKey: "menu.table.sortHelper",
      langCodes: {
        "zh-CN": "数字越小越靠前",
        "en-US": "Smaller numbers come first",
      },
    },
    {
      tKey: "menu.table.menuNameRequired",
      langCodes: {
        "zh-CN": "菜单名称不能为空",
        "en-US": "Menu name is required",
      },
    },
    {
      tKey: "menu.title",
      langCodes: {
        "zh-CN": "菜单管理",
        "en-US": "Menu Management",
      },
    },
  ],
  "system.permission": [
    {
      tKey: "permission.title",
      langCodes: {
        "zh-CN": "权限管理",
        "en-US": "Permission Management",
      },
    },
    {
      tKey: "permission.code",
      langCodes: {
        "zh-CN": "权限代码",
        "en-US": "Permission Code",
      },
    },
    {
      tKey: "permission.name",
      langCodes: {
        "zh-CN": "权限名称",
        "en-US": "Permission Name",
      },
    },
    {
      tKey: "permission.category",
      langCodes: {
        "zh-CN": "权限类别",
        "en-US": "Permission Category",
      },
    },
    {
      tKey: "permission.category.menu",
      langCodes: {
        "zh-CN": "菜单",
        "en-US": "Menu",
      },
    },
    {
      tKey: "permission.category.button",
      langCodes: {
        "zh-CN": "按钮",
        "en-US": "Button",
      },
    },
    {
      tKey: "permission.category.api",
      langCodes: {
        "zh-CN": "接口",
        "en-US": "API",
      },
    },
    {
      tKey: "permission.resource",
      langCodes: {
        "zh-CN": "资源路径",
        "en-US": "Resource Path",
      },
    },
    {
      tKey: "permission.business",
      langCodes: {
        "zh-CN": "业务",
        "en-US": "Business",
      },
    },
    {
      tKey: "permission.category.action",
      langCodes: {
        "zh-CN": "动作",
        "en-US": "Action",
      },
    },
  ],
  system: [
    {
      tKey: "sidebar.menu.oss",
      langCodes: {
        "zh-CN": "存储管理",
        "en-US": "Storage",
      },
    },
    {
      tKey: "sidebar.menu.oss.config",
      langCodes: {
        "zh-CN": "配置管理",
        "en-US": "Config Management",
      },
    },
    {
      tKey: "sidebar.menu.oss.file",
      langCodes: {
        "zh-CN": "文件中心",
        "en-US": "File Center",
      },
    },
  ],
  "system.schema_form": [
    {
      tKey: "schemaForm.title",
      langCodes: {
        "zh-CN": "动态表单配置",
        "en-US": "Schema Form Config",
      },
    },
    {
      tKey: "schemaForm.searchPlaceholder",
      langCodes: {
        "zh-CN": "搜索名称或编码...",
        "en-US": "Search name or code...",
      },
    },
    {
      tKey: "schemaForm.code",
      langCodes: {
        "zh-CN": "表单编码",
        "en-US": "Form Code",
      },
    },
    {
      tKey: "schemaForm.name",
      langCodes: {
        "zh-CN": "表单名称",
        "en-US": "Form Name",
      },
    },
    {
      tKey: "schemaForm.actions.add",
      langCodes: {
        "zh-CN": "新增配置",
        "en-US": "Add Configuration",
      },
    },
    {
      tKey: "schemaForm.actions.preview",
      langCodes: {
        "zh-CN": "预览与校验测试",
        "en-US": "Preview & Test",
      },
    },
    {
      tKey: "schemaForm.deleteConfirmText",
      langCodes: {
        "zh-CN":
          "确定要删除动态表单配置吗？此操作不可撤销，且会影响已提交的关联数据还原。",
        "en-US":
          "Are you sure you want to delete this form config? This cannot be undone and affects submitted data.",
      },
    },
    {
      tKey: "schemaForm.errors.invalidObject",
      langCodes: {
        "zh-CN": "Schema 必须是合法的 JSON 对象",
        "en-US": "Schema must be a valid JSON object",
      },
    },
    {
      tKey: "schemaForm.errors.invalidUiObject",
      langCodes: {
        "zh-CN": "UI Schema 必须是合法的 JSON 对象",
        "en-US": "UI Schema must be a valid JSON object",
      },
    },
    {
      tKey: "schemaForm.errors.invalidJson",
      langCodes: {
        "zh-CN": "请输入合法的 JSON 格式字符串",
        "en-US": "Please enter a valid JSON format string",
      },
    },
    {
      tKey: "schemaForm.editTitle",
      langCodes: {
        "zh-CN": "编辑动态表单配置",
        "en-US": "Edit Schema Form Configuration",
      },
    },
    {
      tKey: "schemaForm.addTitle",
      langCodes: {
        "zh-CN": "新增动态表单配置",
        "en-US": "Add Schema Form Configuration",
      },
    },
    {
      tKey: "schemaForm.quickTemplate",
      langCodes: {
        "zh-CN": "快速套用预设模板",
        "en-US": "Quick Preset Template",
      },
    },
    {
      tKey: "schemaForm.selectTemplate",
      langCodes: {
        "zh-CN": "-- 选择模板 --",
        "en-US": "-- Select Template --",
      },
    },
    {
      tKey: "schemaForm.templates.feedback",
      langCodes: {
        "zh-CN": "用户意见反馈表",
        "en-US": "User Feedback Template",
      },
    },
    {
      tKey: "schemaForm.templates.rsvp",
      langCodes: {
        "zh-CN": "活动报名登记表",
        "en-US": "Activity RSVP Template",
      },
    },
    {
      tKey: "schemaForm.fields.code",
      langCodes: {
        "zh-CN": "表单唯一编码",
        "en-US": "Unique Form Code",
      },
    },
    {
      tKey: "schemaForm.fields.codePlaceholder",
      langCodes: {
        "zh-CN": "例如: customer_survey (仅支持英文字母、数字、下划线和连字符)",
        "en-US":
          "e.g. customer_survey (Letters, numbers, underscores, hyphens only)",
      },
    },
    {
      tKey: "schemaForm.fields.name",
      langCodes: {
        "zh-CN": "表单名称",
        "en-US": "Form Name",
      },
    },
    {
      tKey: "schemaForm.fields.namePlaceholder",
      langCodes: {
        "zh-CN": "例如: 客户满意度回访表",
        "en-US": "e.g. Customer Satisfaction Survey",
      },
    },
    {
      tKey: "schemaForm.fields.schemaData",
      langCodes: {
        "zh-CN": "JSON Schema 配置数据",
        "en-US": "JSON Schema Data",
      },
    },
    {
      tKey: "schemaForm.fields.uiSchemaData",
      langCodes: {
        "zh-CN": "UI Schema 配置数据 (可选)",
        "en-US": "UI Schema Data (Optional)",
      },
    },
    {
      tKey: "schemaForm.fields.remarkPlaceholder",
      langCodes: {
        "zh-CN": "请输入备注描述",
        "en-US": "Please enter remark description",
      },
    },
    {
      tKey: "schemaForm.errors.parseSchemaFailed",
      langCodes: {
        "zh-CN": "无法解析该表单的 JSON Schema，请检查配置是否正确。",
        "en-US": "Unable to parse JSON Schema, please check config.",
      },
    },
    {
      tKey: "schemaForm.errors.submitValidationFailed",
      langCodes: {
        "zh-CN": "数据提交校验失败，请检查填写内容。",
        "en-US": "Validation failed, please check inputs.",
      },
    },
    {
      tKey: "schemaForm.previewTitle",
      langCodes: {
        "zh-CN": "表单预览与提交测试",
        "en-US": "Form Preview & Submission Test",
      },
    },
    {
      tKey: "schemaForm.testSubmitSuccess",
      langCodes: {
        "zh-CN":
          "数据提交测试成功！已写入/更新 system_schema_form_data 关联表。",
        "en-US": "Submission success! Saved to system_schema_form_data.",
      },
    },
    {
      tKey: "schemaForm.fields.testBusinessId",
      langCodes: {
        "zh-CN": "测试关联业务 ID (Business ID)",
        "en-US": "Test Business ID",
      },
    },
    {
      tKey: "schemaForm.fields.testBusinessIdPlaceholder",
      langCodes: {
        "zh-CN": "请输入用于归属的业务主键 ID",
        "en-US": "Please enter Business ID",
      },
    },
    {
      tKey: "schemaForm.submitTestData",
      langCodes: {
        "zh-CN": "提交测试数据",
        "en-US": "Submit Test Data",
      },
    },
    {
      tKey: "schemaForm.errors.noValidSchema",
      langCodes: {
        "zh-CN": "未配置有效的 JSON Schema",
        "en-US": "No valid JSON Schema configured",
      },
    },
  ],
  "system.schema_form_data": [
    {
      tKey: "schemaFormData.title",
      langCodes: {
        "zh-CN": "表单提交数据",
        "en-US": "Schema Form Data",
      },
    },
    {
      tKey: "schemaFormData.filter.associatedForm",
      langCodes: {
        "zh-CN": "关联动态表单",
        "en-US": "Associated Schema Form",
      },
    },
    {
      tKey: "schemaFormData.filter.allForms",
      langCodes: {
        "zh-CN": "-- 全部表单 --",
        "en-US": "-- All Forms --",
      },
    },
    {
      tKey: "schemaFormData.filter.formCode",
      langCodes: {
        "zh-CN": "表单编码",
        "en-US": "Form Code",
      },
    },
    {
      tKey: "schemaFormData.filter.formCodePlaceholder",
      langCodes: {
        "zh-CN": "请输入表单编码过滤",
        "en-US": "Please enter Form Code to filter",
      },
    },
    {
      tKey: "schemaFormData.filter.businessId",
      langCodes: {
        "zh-CN": "关联业务 ID",
        "en-US": "Associated Business ID",
      },
    },
    {
      tKey: "schemaFormData.filter.businessIdPlaceholder",
      langCodes: {
        "zh-CN": "请输入业务 ID 过滤",
        "en-US": "Please enter Business ID to filter",
      },
    },
    {
      tKey: "schemaFormData.errors.noSchemaConfig",
      langCodes: {
        "zh-CN": "未找到该表单的 Schema 配置数据",
        "en-US": "Schema config data not found for this form",
      },
    },
    {
      tKey: "schemaFormData.errors.fallbackToRaw",
      langCodes: {
        "zh-CN": "无法加载原表单配置，已为您降级为原始提交数据展示。",
        "en-US": "Cannot load form config. Falling back to raw JSON.",
      },
    },
    {
      tKey: "schemaFormData.detailsTitle",
      langCodes: {
        "zh-CN": "数据提交详情",
        "en-US": "Submitted Data Details",
      },
    },
    {
      tKey: "schemaFormData.rawJsonData",
      langCodes: {
        "zh-CN": "原始提交数据 (JSON)",
        "en-US": "Raw Submitted Data (JSON)",
      },
    },
    {
      tKey: "schemaFormData.actions.view",
      langCodes: {
        "zh-CN": "查看详情",
        "en-US": "View Details",
      },
    },
    {
      tKey: "schemaFormData.actions.delete",
      langCodes: {
        "zh-CN": "删除记录",
        "en-US": "Delete Record",
      },
    },
    {
      tKey: "schemaFormData.deleteConfirmText",
      langCodes: {
        "zh-CN": "确定要删除此条提交的动态表单数据记录吗？此操作不可逆。",
        "en-US":
          "Are you sure you want to delete this submitted form data? This is irreversible.",
      },
    },
    {
      tKey: "schemaFormData.dataSummary",
      langCodes: {
        "zh-CN": "提交数据概要",
        "en-US": "Submitted Data Summary",
      },
    },
    {
      tKey: "schemaFormData.submittedData",
      langCodes: {
        "zh-CN": "提交数据",
        "en-US": "Submitted Data",
      },
    },
    {
      tKey: "schemaFormData.dataContent",
      langCodes: {
        "zh-CN": "数据内容",
        "en-US": "Data Content",
      },
    },
  ],
} satisfies Record<
  Extract<
    BusinessKey,
    | "system.auth"
    | "system.role_permission"
    | "system.user"
    | "system.department"
    | "system.role"
    | "system.menu"
    | "system.permission"
    | "system"
    | "system.schema_form"
    | "system.schema_form_data"
  >,
  TranslationInputItem[]
>;
