import menuService from "@/api/system/menu/service";
import { UserObj } from "@/types/app";
import { SUPER_ADMIN_ID, SUPER_ADMIN } from "./init";
import { BusinessKey } from "@/types/business";

// name 字段使用多语言键，前端需要根据该键获取对应的翻译
export const initialMenuData = [
  {
    id: 1,
    name: "sidebar.menu.home",
    icon: "material-symbols:home",
    path: "/home",
    sort: 1,
    business: "system.auth",
  },
  {
    id: 2,
    name: "sidebar.menu.me",
    icon: "material-symbols:account-circle",
    path: "/me",
    sort: 2,
    business: "system.auth",
  },
  {
    id: 3,
    name: "sidebar.menu.mail",
    icon: "material-symbols:mail",
    sort: 3,
    business: "mail",
  },
  {
    id: 4,
    name: "sidebar.menu.mail.template",
    icon: "material-symbols:description",
    path: "/mail/template",
    parentId: 3,
    sort: 1,
    business: "mail.template",
  },
  {
    id: 5,
    name: "sidebar.menu.mail.log",
    icon: "material-symbols:history",
    path: "/mail/log",
    parentId: 3,
    sort: 2,
    business: "mail.log",
  },
  {
    id: 6,
    name: "sidebar.menu.mail.send",
    icon: "material-symbols:send",
    path: "/mail/send",
    parentId: 3,
    sort: 3,
    business: "mail.action",
  },
  {
    id: 7,
    name: "sidebar.menu.mail.account",
    icon: "material-symbols:manage-accounts",
    path: "/mail/account",
    parentId: 3,
    sort: 4,
    business: "mail.account",
  },
  {
    id: 8,
    name: "sidebar.menu.system",
    icon: "material-symbols:settings",
    sort: 4,
    business: "system",
  },
  {
    id: 9,
    name: "sidebar.menu.system.role",
    icon: "material-symbols:supervisor-account",
    path: "/system/role",
    parentId: 8,
    sort: 1,
    business: "system.role",
  },
  {
    id: 10,
    name: "sidebar.menu.user",
    icon: "material-symbols:group",
    path: "/system/user",
    parentId: 8,
    sort: 2,
    business: "system.user",
  },
  {
    id: 11,
    name: "sidebar.menu.system.department",
    icon: "material-symbols:groups",
    path: "/system/department",
    parentId: 8,
    sort: 3,
    business: "system.department",
  },
  {
    id: 12,
    name: "sidebar.menu.menu",
    icon: "material-symbols:menu",
    path: "/system/menu",
    parentId: 8,
    sort: 4,
    business: "system.menu",
  },
  {
    id: 13,
    name: "sidebar.menu.i18n",
    icon: "material-symbols:language",
    sort: 5,
    business: "i18n",
  },
  {
    id: 14,
    name: "sidebar.menu.language",
    icon: "material-symbols:language-international",
    path: "/i18n/language",
    parentId: 13,
    sort: 1,
    business: "i18n.language",
  },
  {
    id: 15,
    name: "sidebar.menu.translation",
    icon: "material-symbols:translate",
    path: "/i18n/translation",
    parentId: 13,
    sort: 2,
    business: "i18n.translation",
  },
  {
    id: 16,
    name: "sidebar.menu.i18n.region",
    icon: "material-symbols:public",
    path: "/i18n/region",
    parentId: 13,
    sort: 3,
    business: "i18n.region",
  },
  {
    id: 17,
    name: "sidebar.menu.system.permission",
    icon: "material-symbols:lock",
    path: "/system/permission",
    parentId: 8,
    sort: 5,
    business: "system.permission",
  },
  {
    id: 18,
    name: "sidebar.menu.system.rolePermission",
    icon: "material-symbols:admin-panel-settings",
    path: "/system/role_permission",
    parentId: 8,
    sort: 6,
    business: "system.role_permission",
  },
  {
    id: 19,
    name: "sidebar.menu.operation_maintenance",
    icon: "material-symbols:build",
    sort: 6,
    business: "operation_maintenance",
  },
  {
    id: 20,
    name: "sidebar.menu.operation_maintenance.cache",
    icon: "material-symbols:database",
    path: "/operation_maintenance/cache",
    parentId: 19,
    sort: 1,
    business: "operation_maintenance.cache",
  },
] satisfies menuLike[];

type menuLike = {
  id: number;
  name: string;
  icon: string;
  path?: string | null;
  parentId?: number | null;
  sort: number;
  business?: BusinessKey;
};
/**
 * 初始化菜单
 */
export async function initMenu() {
  // 检查是否已有数据，没有则插入初始数据
  const countResult = await menuService.listAll.service({});
  if (countResult.length === initialMenuData.length) return;
  for (const menu of initialMenuData) {
    await menuService.add.service(
      {
        name: menu.name,
        icon: menu.icon,
        sort: menu.sort,
        path: menu.path || null,
        parentId: menu.parentId || null,
        business: menu.business || null,
        remark: null,
        isEnabled: true,
      },
      { userId: SUPER_ADMIN_ID, langCode: SUPER_ADMIN.langCode } as UserObj
    );
  }
  console.log("💾 表 system_menu 初始数据已插入");
}
