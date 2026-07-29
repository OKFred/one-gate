/**
 * admin app — 系统管理页面文案
 * 覆盖：system/translation.ts 中所有 frontend 条目
 */
export const system = {
  // 角色权限管理
  'rolePermission.title': '角色权限管理',
  'rolePermission.batchAdd': '批量添加权限',
  'rolePermission.selectRole': '选择角色',
  'rolePermission.selectPermissions': '选择权限',
  'rolePermission.availablePermissions': '可用权限',
  'rolePermission.noAvailablePermissions': '暂无可用权限',
  'rolePermission.currentPermissions': '当前权限',
  'rolePermission.assignedPermission': '已分配权限',
  'rolePermission.noPermissions': '暂无权限',
  'rolePermission.advancedSettings': '高级设置',
  'rolePermission.categoryFirst': '类别优先',
  'rolePermission.businessFirst': '业务优先',
  'rolePermission.otherCategory': '其他',
  'rolePermission.keyword': '关键词',
  'rolePermission.keywordPlaceholder': '搜索角色或权限名称',
  'rolePermission.filterByRole': '按角色筛选',
  'rolePermission.filterByPermission': '按权限筛选',
  'rolePermission.batchDelete': '批量删除',
  'rolePermission.confirmBatchDelete': '确定要删除选中的 {count} 个角色权限关联吗？',
  'rolePermission.selectedItems': '选中项目',
  'rolePermission.andMore': '等 {count} 个',
  'rolePermission.hasFilter': '有过滤条件',
  'rolePermission.hasConditions': '有附加条件',
  'system.rolePermission.tree.selectRole': '请先选择角色',
  'dialog.confirmContent': '确定要保存当前权限变更吗？',

  // 用户管理
  'user.table.password': '密码',

  // 部门管理
  'department.title': '部门管理',
  'department.table.name': '名称',
  'department.table.managers': '部门管理员',
  'department.table.parentDepartment': '上级部门',
  'department.table.topLevelDepartment': '无（顶级部门）',
  'department.dialog.addChild': '添加子部门',

  // 角色管理
  'role.table.roleName': '角色名称',
  'role.table.permissions': '权限列表',
  'role.table.permissionsHelper': '权限列表为JSON数组格式',
  'role.table.dataScope': '数据范围',
  'role.dataScope.all': '全部数据',
  'role.dataScope.dept_and_below': '本部门及以下数据',
  'role.dataScope.self_only': '仅本人数据',
  'role.dataScope.custom': '自定义部门',
  'role.dataScope.customDeptIds': '自定义部门ID',

  // 菜单管理
  'menu.dialog.addSubMenu': '添加子菜单',
  'menu.table.menuName': '菜单名称',
  'menu.table.customIcon': '自定义图标 (Iconify格式)',
  'menu.table.iconHelper': '例如: material-symbols:home',
  'menu.table.routePath': '路由路径',
  'menu.table.pathHelper': '例如: /system/menu',
  'menu.table.parentMenu': '父菜单',
  'menu.table.topLevelMenu': '无 (顶级菜单)',
  'menu.table.sort': '排序',
  'menu.table.sortHelper': '数字越小越靠前',
  'menu.table.menuNameRequired': '菜单名称不能为空',
  'menu.title': '菜单管理',

  // 权限管理
  'permission.code': '权限代码',
  'permission.name': '权限名称',
  'permission.category': '权限类别',
  'permission.category.menu': '菜单',
  'permission.category.button': '按钮',
  'permission.category.api': '接口',
  'permission.resource': '资源路径',
  'permission.business': '业务',
  'permission.category.action': '动作',

  // API 令牌管理
  'apiToken.name': '令牌名称',
  'apiToken.namePlaceholder': '为您的 API 令牌指定描述性名称',
  'apiToken.tokenPrefix': '令牌前缀',
  'apiToken.permissions': '权限',
  'apiToken.selectPermissions': '选择要分配给此令牌的权限',
  'apiToken.ipWhitelist': '客户端 IP 地址筛选',
  'apiToken.ipWhitelistHint':
    '选择要筛选的 IP 地址或 IP 地址范围。如果不添加，此令牌适用于所有地址。',
  'apiToken.startTime': '生效时间',
  'apiToken.expireTime': '过期时间',
  'apiToken.never': '永不过期',
  'apiToken.lastUsed': '上次使用',
  'apiToken.status': '状态',
  'apiToken.searchPlaceholder': '搜索令牌名称',
  'apiToken.tokenCreated': 'API 令牌创建成功',
  'apiToken.tokenOnceWarning':
    '这是此令牌唯一一次显示。请务必将它复制到安全的地方妥善保存。一旦关闭此窗口，您将无法再次查看该令牌的完整内容。',
  'apiToken.copied': '令牌已复制到剪贴板',
} as const satisfies Record<string, string>;
