import db from "@/db/index";
import { menuTable } from "@/api/system/menu/model";
import { sql } from "drizzle-orm";
import { SUPER_ADMIN_ID } from "./init";
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
    name: "sidebar.menu.maintenance",
    icon: "material-symbols:build",
    sort: 6,
    business: "maintenance",
  },
  {
    id: 20,
    name: "sidebar.menu.maintenance.cache",
    icon: "material-symbols:database",
    path: "/maintenance/cache",
    parentId: 19,
    sort: 1,
    business: "maintenance.cache",
  },
  {
    id: 21,
    name: "sidebar.menu.maintenance.openapi",
    icon: "material-symbols:api",
    path: "/maintenance/openapi",
    parentId: 19,
    sort: 2,
    business: "maintenance",
  },
  {
    id: 22,
    name: "sidebar.menu.maintenance.auditLogin",
    icon: "material-symbols:history-edu",
    path: "/maintenance/auditLogin",
    parentId: 19,
    sort: 3,
    business: "maintenance.audit_login",
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
export async function initMenu(options?: { reset?: boolean }) {
  console.log("🔐 开始初始化菜单数据...");
  const stats = {
    total: initialMenuData.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  try {
    if (options?.reset) {
      await db.delete(menuTable);
      console.log("🗑️  已重置菜单数据表");
    }

    const creatorId = SUPER_ADMIN_ID;

    // 准备数据
    const mappedData = initialMenuData.map((menu) => ({
      id: menu.id,
      name: menu.name,
      icon: menu.icon,
      sort: menu.sort,
      path: menu.path || null,
      parentId: menu.parentId || null,
      business: menu.business || null,
      remark: null,
      isEnabled: true,
      creatorId,
    }));

    // 执行 Upsert (基于 ID，因为 initialMenuData 带有 ID)
    await db
      .insert(menuTable)
      .values(mappedData)
      .onConflictDoUpdate({
        target: menuTable.id,
        set: {
          name: sql`excluded.name`,
          icon: sql`excluded.icon`,
          sort: sql`excluded.sort`,
          path: sql`excluded.path`,
          parentId: sql`excluded.parent_id`,
          business: sql`excluded.business`,
        },
      });

    stats.created = mappedData.length;
    console.log(`✅ 成功同步 ${stats.created} 条菜单数据`);
    return stats;
  } catch (error) {
    console.error("❌ 菜单初始化失败:", error);
    throw error;
  }
}
