// 初始菜单数据
// name 字段使用多语言键，前端需要根据该键获取对应的翻译
export const initialMenuData = [
  {
    id: 1,
    name: "menu.home",
    icon: "material-symbols:home",
    path: "/home",
    sort: 1,
  },
  {
    id: 2,
    name: "menu.me",
    icon: "material-symbols:account-circle",
    path: "/me",
    sort: 2,
  },
  {
    id: 3,
    name: "menu.mail",
    icon: "material-symbols:mail",
    sort: 3,
  },
  {
    id: 4,
    name: "menu.mail.template",
    icon: "material-symbols:description",
    path: "/mail/template",
    parentId: 3,
    sort: 1,
  },
  {
    id: 5,
    name: "menu.mail.log",
    icon: "material-symbols:history",
    path: "/mail/log",
    parentId: 3,
    sort: 2,
  },
  {
    id: 6,
    name: "menu.mail.send",
    icon: "material-symbols:send",
    path: "/mail/send",
    parentId: 3,
    sort: 3,
  },
  {
    id: 7,
    name: "menu.mail.account",
    icon: "material-symbols:manage-accounts",
    path: "/mail/account",
    parentId: 3,
    sort: 4,
  },
  {
    id: 8,
    name: "menu.system",
    icon: "material-symbols:settings",
    sort: 4,
    roleIdArr: [1], // 仅管理员可见
  },
  {
    id: 9,
    name: "menu.system.role",
    icon: "material-symbols:supervisor-account",
    path: "/system/role",
    parentId: 8,
    sort: 1,
  },
  {
    id: 10,
    name: "menu.system.user",
    icon: "material-symbols:group",
    path: "/system/user",
    parentId: 8,
    sort: 2,
  },
  {
    id: 11,
    name: "menu.system.department",
    icon: "material-symbols:groups",
    path: "/system/department",
    parentId: 8,
    sort: 3,
  },
  {
    id: 12,
    name: "menu.system.menu",
    icon: "material-symbols:menu",
    path: "/system/menu",
    parentId: 8,
    sort: 4,
  },
  {
    id: 13,
    name: "menu.i18n",
    icon: "material-symbols:language",
    sort: 5,
    roleIdArr: [1], // 仅管理员可见
  },
  {
    id: 14,
    name: "menu.i18n.translation",
    icon: "material-symbols:font-download",
    path: "/i18n/translation",
    parentId: 13,
    sort: 1,
  },
  {
    id: 15,
    name: "menu.i18n.region",
    icon: "material-symbols:public",
    path: "/i18n/region",
    parentId: 13,
    sort: 2,
  }
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
