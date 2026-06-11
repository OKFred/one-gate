import type { BatchTranslationItem } from "@/db/initTranslation";

export const systemTranslations: BatchTranslationItem[] = [
  {
    application: "frontend",
    business: "system.auth",
    tKey: "form.missingCredentials",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入用户名和密码",
      "en-US": "Please enter username and password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "topbar.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "条条大道通罗马",
      "en-US": "All roads lead to Rome",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "topbar.profile",
    isEnabled: true,
    langCodes: {
      "zh-CN": "个人设置",
      "en-US": "Profile",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "topbar.logout",
    isEnabled: true,
    langCodes: {
      "zh-CN": "退出登录",
      "en-US": "Log out",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "topbar.notLoggedIn",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未登录",
      "en-US": "Not signed in",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.username",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户名",
      "en-US": "Username",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.password",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码",
      "en-US": "Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.signIn",
    isEnabled: true,
    langCodes: {
      "zh-CN": "登录",
      "en-US": "Sign in",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.wechatSignIn",
    isEnabled: true,
    langCodes: {
      "zh-CN": "微信登录",
      "en-US": "WeChat Sign in",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.wechatWIP",
    isEnabled: true,
    langCodes: {
      "zh-CN": "微信登录功能正在开发中...",
      "en-US": "WeChat sign-in is under development...",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "login.forgotPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "忘记密码？",
      "en-US": "Forgot password?",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "dialog.message",
    isEnabled: true,
    langCodes: {
      "zh-CN": "页面未找到",
      "en-US": "Page Not Found",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "dialog.goBackHome",
    isEnabled: true,
    langCodes: {
      "zh-CN": "返回首页",
      "en-US": "Go Back Home",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "errorHandler.system.rolePermission.recordNotFound",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色权限记录不存在",
      "en-US": "Role permission record not found",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "errorHandler.system.rolePermission.roleNotFound",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关联角色不存在",
      "en-US": "Associated role not found",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "errorHandler.system.rolePermission.permissionNotFound",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关联权限不存在",
      "en-US": "Associated permission not found",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "home.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "欢迎使用",
      "en-US": "Welcome",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "home.subtitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "一站式信息管理解决方案",
      "en-US": "All-in-one information management solution",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.accounts",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件账户",
      "en-US": "Mail Accounts",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.templates",
    isEnabled: true,
    langCodes: {
      "zh-CN": "邮件模板",
      "en-US": "Mail Templates",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.todaySent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "今日发送",
      "en-US": "Sent Today",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "快速开始",
      "en-US": "Quick Start",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.configureAccounts",
    isEnabled: true,
    langCodes: {
      "zh-CN": "🔧 配置邮件账户：在邮件账户管理中添加您的SMTP配置",
      "en-US": "🔧 Configure accounts: Add your SMTP settings in Mail Accounts",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.createTemplate",
    isEnabled: true,
    langCodes: {
      "zh-CN": "📝 创建邮件模板：设计可重复使用的邮件模板",
      "en-US": "📝 Create templates: Design reusable mail templates",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.sendMail",
    isEnabled: true,
    langCodes: {
      "zh-CN": "📧 发送邮件：使用模板快速发送邮件",
      "en-US": "📧 Send mail: Quickly send using templates",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "quickStart.viewLogs",
    isEnabled: true,
    langCodes: {
      "zh-CN": "📊 查看日志：监控邮件发送状态和历史记录",
      "en-US": "📊 View logs: Monitor mail send status and history",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "我的",
      "en-US": "My Profile",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "修改密码",
      "en-US": "Change Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.confirmPasswordRequired",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确认密码必填",
      "en-US": "Confirm Password Required",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.table.currentPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前密码",
      "en-US": "Current Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.table.newPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新密码",
      "en-US": "New Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.table.confirmPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确认新密码",
      "en-US": "Confirm New Password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.subtitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "个人信息",
      "en-US": "Personal Information",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.region",
    isEnabled: true,
    langCodes: {
      "zh-CN": "国家/地区",
      "en-US": "Country/Region",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.department",
    isEnabled: true,
    langCodes: {
      "zh-CN": "部门",
      "en-US": "Department",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.role",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色",
      "en-US": "Role",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.accountStatus",
    isEnabled: true,
    langCodes: {
      "zh-CN": "账户状态",
      "en-US": "Account Status",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.passwordFormatHint",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码长度7位~30位，至少包含一个字母和一个数字",
      "en-US":
        "Password length is from 7 to 30, and requires one word and one number at least",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.sameAsOldPassword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新密码不能与当前密码相同",
      "en-US": "New password cannot be the same as current password",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.passwordMismatch",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新密码与确认密码不匹配",
      "en-US": "New password and confirm password do not match",
    },
  },
  {
    application: "frontend",
    business: "system.auth",
    tKey: "me.changePassword.success",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码修改成功",
      "en-US": "Password changed successfully",
    },
  },
  {
    application: "frontend",
    business: "system.user",
    tKey: "user.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户管理",
      "en-US": "User Management",
    },
  },
  {
    application: "frontend",
    business: "system.user",
    tKey: "user.table.password",
    isEnabled: true,
    langCodes: {
      "zh-CN": "密码",
      "en-US": "Password",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "部门管理",
      "en-US": "Department Management",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.table.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "名称",
      "en-US": "Name",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.table.managers",
    isEnabled: true,
    langCodes: {
      "zh-CN": "部门管理员",
      "en-US": "Department Managers",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.table.roleName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色名称",
      "en-US": "Role Name",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.table.permissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限列表",
      "en-US": "Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.table.permissionsHelper",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限列表为JSON数组格式",
      "en-US": "Permissions list in JSON array format",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.dialog.addSubMenu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加子菜单",
      "en-US": "Add Sub-menu",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.menuName",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单名称",
      "en-US": "Menu Name",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.customIcon",
    isEnabled: true,
    langCodes: {
      "zh-CN": "自定义图标 (Iconify格式)",
      "en-US": "Custom Icon (Iconify Format)",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.iconHelper",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: material-symbols:home",
      "en-US": "e.g., material-symbols:home",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.routePath",
    isEnabled: true,
    langCodes: {
      "zh-CN": "路由路径",
      "en-US": "Route Path",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.pathHelper",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: /system/menu",
      "en-US": "e.g., /system/menu",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.parentMenu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "父菜单",
      "en-US": "Parent Menu",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.topLevelMenu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无 (顶级菜单)",
      "en-US": "None (Top Level)",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.sort",
    isEnabled: true,
    langCodes: {
      "zh-CN": "排序",
      "en-US": "Sort",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.sortHelper",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数字越小越靠前",
      "en-US": "Smaller numbers come first",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.table.menuNameRequired",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单名称不能为空",
      "en-US": "Menu name is required",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.table.parentDepartment",
    isEnabled: true,
    langCodes: {
      "zh-CN": "上级部门",
      "en-US": "Parent Department",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.table.topLevelDepartment",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无（顶级部门）",
      "en-US": "None (Top Level)",
    },
  },
  {
    application: "frontend",
    business: "system.department",
    tKey: "department.dialog.addChild",
    isEnabled: true,
    langCodes: {
      "zh-CN": "添加子部门",
      "en-US": "Add Sub-Department",
    },
  },
  {
    application: "frontend",
    business: "system.menu",
    tKey: "menu.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单管理",
      "en-US": "Menu Management",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色管理",
      "en-US": "Role Management",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限管理",
      "en-US": "Permission Management",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限代码",
      "en-US": "Permission Code",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限名称",
      "en-US": "Permission Name",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category",
    isEnabled: true,
    langCodes: {
      "zh-CN": "权限类别",
      "en-US": "Permission Category",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.menu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单",
      "en-US": "Menu",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.button",
    isEnabled: true,
    langCodes: {
      "zh-CN": "按钮",
      "en-US": "Button",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.api",
    isEnabled: true,
    langCodes: {
      "zh-CN": "接口",
      "en-US": "API",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.resource",
    isEnabled: true,
    langCodes: {
      "zh-CN": "资源路径",
      "en-US": "Resource Path",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.business",
    isEnabled: true,
    langCodes: {
      "zh-CN": "业务",
      "en-US": "Business",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "角色权限管理",
      "en-US": "Role Permission Management",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.batchAdd",
    isEnabled: true,
    langCodes: {
      "zh-CN": "批量添加权限",
      "en-US": "Batch Add Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.selectRole",
    isEnabled: true,
    langCodes: {
      "zh-CN": "选择角色",
      "en-US": "Select Role",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.selectPermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "选择权限",
      "en-US": "Select Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.availablePermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "可用权限",
      "en-US": "Available Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.noAvailablePermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂无可用权限",
      "en-US": "No Available Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.currentPermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "当前权限",
      "en-US": "Current Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.assignedPermission",
    isEnabled: true,
    langCodes: {
      "zh-CN": "已分配权限",
      "en-US": "Assigned Permission",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.noPermissions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "暂无权限",
      "en-US": "No Permissions",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.advancedSettings",
    isEnabled: true,
    langCodes: {
      "zh-CN": "高级设置",
      "en-US": "Advanced Settings",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.categoryFirst",
    isEnabled: true,
    langCodes: {
      "zh-CN": "类别优先",
      "en-US": "Category First",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.businessFirst",
    isEnabled: true,
    langCodes: {
      "zh-CN": "业务优先",
      "en-US": "Business First",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.otherCategory",
    isEnabled: true,
    langCodes: {
      "zh-CN": "其他",
      "en-US": "Other",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.keyword",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关键词",
      "en-US": "Keyword",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.keywordPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索角色或权限名称",
      "en-US": "Search role or permission name",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.filterByRole",
    isEnabled: true,
    langCodes: {
      "zh-CN": "按角色筛选",
      "en-US": "Filter by Role",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.filterByPermission",
    isEnabled: true,
    langCodes: {
      "zh-CN": "按权限筛选",
      "en-US": "Filter by Permission",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.batchDelete",
    isEnabled: true,
    langCodes: {
      "zh-CN": "批量删除",
      "en-US": "Batch Delete",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.confirmBatchDelete",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确定要删除选中的 {count} 个角色权限关联吗？",
      "en-US":
        "Are you sure you want to delete the selected {count} role-permission associations?",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.selectedItems",
    isEnabled: true,
    langCodes: {
      "zh-CN": "选中项目",
      "en-US": "Selected Items",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.andMore",
    isEnabled: true,
    langCodes: {
      "zh-CN": "等 {count} 个",
      "en-US": "and {count} more",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.hasFilter",
    isEnabled: true,
    langCodes: {
      "zh-CN": "有过滤条件",
      "en-US": "Has Filter",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission",
    tKey: "rolePermission.hasConditions",
    isEnabled: true,
    langCodes: {
      "zh-CN": "有附加条件",
      "en-US": "Has Conditions",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.table.dataScope",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据范围",
      "en-US": "Data Scope",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.all",
    isEnabled: true,
    langCodes: {
      "zh-CN": "全部数据",
      "en-US": "All Data",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.dept_and_below",
    isEnabled: true,
    langCodes: {
      "zh-CN": "本部门及以下数据",
      "en-US": "Dept & Below Data",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.self_only",
    isEnabled: true,
    langCodes: {
      "zh-CN": "仅本人数据",
      "en-US": "Self Only",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.custom",
    isEnabled: true,
    langCodes: {
      "zh-CN": "自定义部门",
      "en-US": "Custom Departments",
    },
  },
  {
    application: "frontend",
    business: "system.role",
    tKey: "role.dataScope.customDeptIds",
    isEnabled: true,
    langCodes: {
      "zh-CN": "自定义部门ID",
      "en-US": "Custom Departments IDs",
    },
  },
  {
    application: "frontend",
    business: "system.rolePermission.tree",
    tKey: "system.rolePermission.tree.selectRole",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请先选择角色",
      "en-US": "Please select a role first",
    },
  },
  {
    application: "frontend",
    business: "system",
    tKey: "sidebar.menu.oss",
    isEnabled: true,
    langCodes: {
      "zh-CN": "存储管理",
      "en-US": "Storage",
    },
  },
  {
    application: "frontend",
    business: "system",
    tKey: "sidebar.menu.oss.config",
    isEnabled: true,
    langCodes: {
      "zh-CN": "配置管理",
      "en-US": "Config Management",
    },
  },
  {
    application: "frontend",
    business: "system",
    tKey: "sidebar.menu.oss.file",
    isEnabled: true,
    langCodes: {
      "zh-CN": "文件中心",
      "en-US": "File Center",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.menu",
    isEnabled: true,
    langCodes: {
      "zh-CN": "菜单",
      "en-US": "Menu",
    },
  },
  {
    application: "frontend",
    business: "system.permission",
    tKey: "permission.category.action",
    isEnabled: true,
    langCodes: {
      "zh-CN": "动作",
      "en-US": "Action",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "动态表单配置",
      "en-US": "Schema Form Config",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.searchPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "搜索名称或编码...",
      "en-US": "Search name or code...",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单编码",
      "en-US": "Form Code",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单名称",
      "en-US": "Form Name",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.actions.add",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新增配置",
      "en-US": "Add Configuration",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.actions.preview",
    isEnabled: true,
    langCodes: {
      "zh-CN": "预览与校验测试",
      "en-US": "Preview & Test",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.deleteConfirmText",
    isEnabled: true,
    langCodes: {
      "zh-CN":
        "确定要删除动态表单配置吗？此操作不可撤销，且会影响已提交的关联数据还原。",
      "en-US":
        "Are you sure you want to delete this form config? This cannot be undone and affects submitted data.",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.errors.invalidObject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "Schema 必须是合法的 JSON 对象",
      "en-US": "Schema must be a valid JSON object",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.errors.invalidUiObject",
    isEnabled: true,
    langCodes: {
      "zh-CN": "UI Schema 必须是合法的 JSON 对象",
      "en-US": "UI Schema must be a valid JSON object",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.errors.invalidJson",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入合法的 JSON 格式字符串",
      "en-US": "Please enter a valid JSON format string",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.editTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "编辑动态表单配置",
      "en-US": "Edit Schema Form Configuration",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.addTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "新增动态表单配置",
      "en-US": "Add Schema Form Configuration",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.quickTemplate",
    isEnabled: true,
    langCodes: {
      "zh-CN": "快速套用预设模板",
      "en-US": "Quick Preset Template",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.selectTemplate",
    isEnabled: true,
    langCodes: {
      "zh-CN": "-- 选择模板 --",
      "en-US": "-- Select Template --",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.templates.feedback",
    isEnabled: true,
    langCodes: {
      "zh-CN": "用户意见反馈表",
      "en-US": "User Feedback Template",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.templates.rsvp",
    isEnabled: true,
    langCodes: {
      "zh-CN": "活动报名登记表",
      "en-US": "Activity RSVP Template",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.fields.code",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单唯一编码",
      "en-US": "Unique Form Code",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.fields.codePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: customer_survey (仅支持英文字母、数字、下划线和连字符)",
      "en-US":
        "e.g. customer_survey (Letters, numbers, underscores, hyphens only)",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.fields.name",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单名称",
      "en-US": "Form Name",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.fields.namePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "例如: 客户满意度回访表",
      "en-US": "e.g. Customer Satisfaction Survey",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.fields.schemaData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "JSON Schema 配置数据",
      "en-US": "JSON Schema Data",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.fields.uiSchemaData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "UI Schema 配置数据 (可选)",
      "en-US": "UI Schema Data (Optional)",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.fields.remarkPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入备注描述",
      "en-US": "Please enter remark description",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.errors.parseSchemaFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无法解析该表单的 JSON Schema，请检查配置是否正确。",
      "en-US": "Unable to parse JSON Schema, please check config.",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.errors.submitValidationFailed",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据提交校验失败，请检查填写内容。",
      "en-US": "Validation failed, please check inputs.",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.previewTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单预览与提交测试",
      "en-US": "Form Preview & Submission Test",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.testSubmitSuccess",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据提交测试成功！已写入/更新 system_schema_form_data 关联表。",
      "en-US": "Submission success! Saved to system_schema_form_data.",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.fields.testBusinessId",
    isEnabled: true,
    langCodes: {
      "zh-CN": "测试关联业务 ID (Business ID)",
      "en-US": "Test Business ID",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.fields.testBusinessIdPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入用于归属的业务主键 ID",
      "en-US": "Please enter Business ID",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.submitTestData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提交测试数据",
      "en-US": "Submit Test Data",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form",
    tKey: "schemaForm.errors.noValidSchema",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未配置有效的 JSON Schema",
      "en-US": "No valid JSON Schema configured",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.title",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单提交数据",
      "en-US": "Schema Form Data",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.filter.associatedForm",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关联动态表单",
      "en-US": "Associated Schema Form",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.filter.allForms",
    isEnabled: true,
    langCodes: {
      "zh-CN": "-- 全部表单 --",
      "en-US": "-- All Forms --",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.filter.formCode",
    isEnabled: true,
    langCodes: {
      "zh-CN": "表单编码",
      "en-US": "Form Code",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.filter.formCodePlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入表单编码过滤",
      "en-US": "Please enter Form Code to filter",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.filter.businessId",
    isEnabled: true,
    langCodes: {
      "zh-CN": "关联业务 ID",
      "en-US": "Associated Business ID",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.filter.businessIdPlaceholder",
    isEnabled: true,
    langCodes: {
      "zh-CN": "请输入业务 ID 过滤",
      "en-US": "Please enter Business ID to filter",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.errors.noSchemaConfig",
    isEnabled: true,
    langCodes: {
      "zh-CN": "未找到该表单的 Schema 配置数据",
      "en-US": "Schema config data not found for this form",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.errors.fallbackToRaw",
    isEnabled: true,
    langCodes: {
      "zh-CN": "无法加载原表单配置，已为您降级为原始提交数据展示。",
      "en-US": "Cannot load form config. Falling back to raw JSON.",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.detailsTitle",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据提交详情",
      "en-US": "Submitted Data Details",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.rawJsonData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "原始提交数据 (JSON)",
      "en-US": "Raw Submitted Data (JSON)",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.actions.view",
    isEnabled: true,
    langCodes: {
      "zh-CN": "查看详情",
      "en-US": "View Details",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.actions.delete",
    isEnabled: true,
    langCodes: {
      "zh-CN": "删除记录",
      "en-US": "Delete Record",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.deleteConfirmText",
    isEnabled: true,
    langCodes: {
      "zh-CN": "确定要删除此条提交的动态表单数据记录吗？此操作不可逆。",
      "en-US":
        "Are you sure you want to delete this submitted form data? This is irreversible.",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.dataSummary",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提交数据概要",
      "en-US": "Submitted Data Summary",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.submittedData",
    isEnabled: true,
    langCodes: {
      "zh-CN": "提交数据",
      "en-US": "Submitted Data",
    },
  },
  {
    application: "frontend",
    business: "system.schema_form_data",
    tKey: "schemaFormData.dataContent",
    isEnabled: true,
    langCodes: {
      "zh-CN": "数据内容",
      "en-US": "Data Content",
    },
  },
];
