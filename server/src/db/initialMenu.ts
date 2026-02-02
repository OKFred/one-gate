// 初始菜单数据
// name 字段使用多语言键，前端需要根据该键获取对应的翻译
export const initialMenuData = [
  {
    id: 1,
    name: "sidebar.menu.home",
    icon: "material-symbols:home",
    path: "/home",
    sort: 1,
  },
  {
    id: 2,
    name: "sidebar.menu.me",
    icon: "material-symbols:account-circle",
    path: "/me",
    sort: 2,
  },
  {
    id: 3,
    name: "sidebar.menu.mail",
    icon: "material-symbols:mail",
    sort: 3,
  },
  {
    id: 4,
    name: "sidebar.menu.mail.template",
    icon: "material-symbols:description",
    path: "/mail/template",
    parentId: 3,
    sort: 1,
  },
  {
    id: 5,
    name: "sidebar.menu.mail.log",
    icon: "material-symbols:history",
    path: "/mail/log",
    parentId: 3,
    sort: 2,
  },
  {
    id: 6,
    name: "sidebar.menu.mail.send",
    icon: "material-symbols:send",
    path: "/mail/send",
    parentId: 3,
    sort: 3,
  },
  {
    id: 7,
    name: "sidebar.menu.mail.account",
    icon: "material-symbols:manage-accounts",
    path: "/mail/account",
    parentId: 3,
    sort: 4,
  },
  {
    id: 8,
    name: "sidebar.menu.system",
    icon: "material-symbols:settings",
    sort: 4,
  },
  {
    id: 9,
    name: "sidebar.menu.system.role",
    icon: "material-symbols:supervisor-account",
    path: "/system/role",
    parentId: 8,
    sort: 1,
  },
  {
    id: 10,
    name: "sidebar.menu.user",
    icon: "material-symbols:group",
    path: "/system/user",
    parentId: 8,
    sort: 2,
  },
  {
    id: 11,
    name: "sidebar.menu.system.department",
    icon: "material-symbols:groups",
    path: "/system/department",
    parentId: 8,
    sort: 3,
  },
  {
    id: 12,
    name: "sidebar.menu.menu",
    icon: "material-symbols:menu",
    path: "/system/menu",
    parentId: 8,
    sort: 4,
  },
  {
    id: 13,
    name: "sidebar.menu.i18n",
    icon: "material-symbols:language",
    sort: 5,
  },
  {
    id: 14,
    name: "sidebar.menu.language",
    icon: "material-symbols:language-international",
    path: "/i18n/language",
    parentId: 13,
    sort: 1,
  },
  {
    id: 15,
    name: "sidebar.menu.translation",
    icon: "material-symbols:translate",
    path: "/i18n/translation",
    parentId: 13,
    sort: 2,
  },
  {
    id: 16,
    name: "sidebar.menu.i18n.region",
    icon: "material-symbols:public",
    path: "/i18n/region",
    parentId: 13,
    sort: 3,
  },
  {
    id: 17,
    name: "sidebar.menu.system.permission",
    icon: "material-symbols:lock",
    path: "/system/permission",
    parentId: 8,
    sort: 5,
  },
  {
    id: 18,
    name: "sidebar.menu.system.rolePermission",
    icon: "material-symbols:admin-panel-settings",
    path: "/system/role-permission",
    parentId: 8,
    sort: 6,
  },
] as menuLike[];

type menuLike = {
  id: number;
  name: string;
  icon: string;
  path?: string | null;
  parentId?: number | null;
  sort: number;
};
