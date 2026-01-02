// 初始菜单数据
export const initialMenuData = [
  {
    id: 1,
    name: "主页",
    icon: "material-symbols:home",
    path: "/home",
    sort: 1,
  },
  {
    id: 2,
    name: "我的",
    icon: "material-symbols:account-circle",
    path: "/me",
    sort: 2,
  },
  {
    id: 3,
    name: "邮件管理",
    icon: "material-symbols:mail",
    sort: 3,
  },
  {
    id: 4,
    name: "模板",
    icon: "material-symbols:description",
    path: "/mail/template",
    parentId: 3,
    sort: 1,
  },
  {
    id: 5,
    name: "日志",
    icon: "material-symbols:history",
    path: "/mail/log",
    parentId: 3,
    sort: 2,
  },
  {
    id: 6,
    name: "发送",
    icon: "material-symbols:send",
    path: "/mail/send",
    parentId: 3,
    sort: 3,
  },
  {
    id: 7,
    name: "账户",
    icon: "material-symbols:manage-accounts",
    path: "/mail/account",
    parentId: 3,
    sort: 4,
  },
  {
    id: 8,
    name: "系统管理",
    icon: "material-symbols:settings",
    sort: 4,
    roleIdArr: [1], // 仅管理员可见
  },
  {
    id: 9,
    name: "角色",
    icon: "material-symbols:supervisor-account",
    path: "/system/role",
    parentId: 8,
    sort: 1,
  },
  {
    id: 10,
    name: "人员",
    icon: "material-symbols:group",
    path: "/system/user",
    parentId: 8,
    sort: 2,
  },
  {
    id: 11,
    name: "部门",
    icon: "material-symbols:groups",
    path: "/system/department",
    parentId: 8,
    sort: 3,
  },
  {
    id: 12,
    name: "菜单",
    icon: "material-symbols:menu",
    path: "/system/menu",
    parentId: 8,
    sort: 4,
  },
] as menuLike[];

type menuLike = {
  id: number;
  name: string;
  icon: string;
  path?: string | null;
  parentId?: number | null;
  sort: number;
  roleIdArr?: number[];
};
