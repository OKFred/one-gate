/**
 * 菜单相关 API
 */

export interface MenuItem {
  /** 菜单唯一标识 */
  id: string;
  /** 菜单名称 */
  text: string;
  /** 图标名称，使用 Iconify material-symbols 图标 */
  icon: string;
  /** 路由路径 */
  path?: string;
  /** 子菜单 */
  children?: MenuItem[];
  /** 排序 */
  sort?: number;
  /** 是否需要特定角色 */
  roleIds?: string[];
}

// Mock 菜单数据
const mockMenuData: MenuItem[] = [
  {
    id: '1',
    text: '主页',
    icon: 'material-symbols:home',
    path: '/home',
    sort: 1,
  },
  {
    id: '2',
    text: '我的',
    icon: 'material-symbols:account-circle',
    path: '/user',
    sort: 2,
  },
  {
    id: '3',
    text: '用户管理',
    icon: 'material-symbols:group',
    path: '/user/management',
    sort: 3,
    roleIds: ['1'], // 仅管理员可见
  },
  {
    id: '4',
    text: '部门',
    icon: 'material-symbols:groups',
    path: '/system/department',
    sort: 4,
  },
  {
    id: '5',
    text: '邮件',
    icon: 'material-symbols:mail',
    sort: 5,
    children: [
      {
        id: '5-1',
        text: '邮件模板',
        icon: 'material-symbols:description',
        path: '/mail/template',
        sort: 1,
      },
      {
        id: '5-2',
        text: '邮件日志',
        icon: 'material-symbols:history',
        path: '/mail/log',
        sort: 2,
      },
      {
        id: '5-3',
        text: '邮件发送',
        icon: 'material-symbols:send',
        path: '/mail/send',
        sort: 3,
      },
      {
        id: '5-4',
        text: '邮件账户',
        icon: 'material-symbols:manage-accounts',
        path: '/mail/account',
        sort: 4,
      },
    ],
  },
];

/**
 * 获取菜单列表（Mock）
 * 后续可以替换为真实 API 调用
 */
export const getMenuList = async (): Promise<MenuItem[]> => {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 100));

  const userRoleIds = ['1']; // 假设当前用户角色 ID 列表
  const filteredMenus = filterMenuByRole(mockMenuData, userRoleIds);
  return filteredMenus;
};

/**
 * 根据用户角色过滤菜单
 */
const filterMenuByRole = (menus: MenuItem[], userRoleIds: string[]): MenuItem[] => {
  return menus
    .filter((menu) => {
      // 如果菜单没有设置角色限制，则所有人可见
      if (!menu.roleIds || menu.roleIds.length === 0) {
        return true;
      }
      // 检查用户是否有对应角色
      return menu.roleIds.some((roleId) => userRoleIds.includes(roleId));
    })
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterMenuByRole(menu.children, userRoleIds) : undefined,
      roleIds: undefined, // 过滤掉角色信息
    }));
};
