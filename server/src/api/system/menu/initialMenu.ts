// 初始菜单数据
export const initialMenuData = [
  {
    id: 1,
    text: "主页",
    icon: "material-symbols:home",
    path: "/home",
    sort: 1,
  },
  {
    id: 2,
    text: "我的",
    icon: "material-symbols:account-circle",
    path: "/me",
    sort: 2,
  },
  {
    id: 3,
    text: "邮件管理",
    icon: "material-symbols:mail",
    sort: 3,
  },
  {
    id: 4,
    text: "模板",
    icon: "material-symbols:description",
    path: "/mail/template",
    parentId: 3,
    sort: 1,
  },
  {
    id: 5,
    text: "日志",
    icon: "material-symbols:history",
    path: "/mail/log",
    parentId: 3,
    sort: 2,
  },
  {
    id: 6,
    text: "发送",
    icon: "material-symbols:send",
    path: "/mail/send",
    parentId: 3,
    sort: 3,
  },
  {
    id: 7,
    text: "账户",
    icon: "material-symbols:manage-accounts",
    path: "/mail/account",
    parentId: 3,
    sort: 4,
  },
  {
    id: 8,
    text: "系统管理",
    icon: "material-symbols:settings",
    sort: 4,
    roleIdArr: [1], // 仅管理员可见
  },
  {
    id: 9,
    text: "人员",
    icon: "material-symbols:group",
    path: "/system/user",
    parentId: 8,
    sort: 1,
  },
  {
    id: 10,
    text: "部门",
    icon: "material-symbols:groups",
    path: "/system/department",
    parentId: 8,
    sort: 2,
  },
] as menuLike[];

type menuLike = {
  id: number;
  text: string;
  icon: string;
  path?: string | null;
  parentId?: number | null;
  sort: number;
  roleIdArr?: number[];
};