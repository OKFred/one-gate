import db from "./index";
import { menuTable } from "../../../admin/src/system/menu/model";
import { permissionTable } from "../../../admin/src/system/permission/model";
import { sql, inArray } from "drizzle-orm";
import { SUPER_ADMIN_ID } from "./init";
import { BusinessKey } from "../types/business";
import { initialTranslationData } from "./initTranslation";
import { getEnv } from "../utils/env";

const LOCALE = getEnv("LOCALE") || "zh-CN";

// name 字段使用多语言键，前端需要根据该键获取对应的翻译
export const initialMenuData = [
  {
    id: 1,
    name: "sidebar.menu.home",
    icon: "material-symbols:home",
    path: "/home",
    sort: 1,
    business: "admin.system.auth",
  },
  {
    id: 2,
    name: "sidebar.menu.me",
    icon: "material-symbols:account-circle",
    path: "/me",
    sort: 2,
    business: "admin.system.auth",
  },
  {
    id: 42,
    name: "sidebar.menu.admin",
    icon: "material-symbols:construction",
    sort: 3,
    business: "admin",
  },
  {
    id: 43,
    name: "sidebar.menu.data",
    icon: "material-symbols:database",
    parentId: 42,
    sort: 2,
    business: "admin.data",
  },
  {
    id: 3,
    name: "sidebar.menu.mail",
    icon: "material-symbols:mail",
    parentId: 42,
    sort: 3,
    business: "admin.mail",
  },
  {
    id: 4,
    name: "sidebar.menu.mail.template",
    icon: "material-symbols:description",
    path: "/admin/mail/template",
    parentId: 3,
    sort: 1,
    business: "admin.mail.template",
  },
  {
    id: 5,
    name: "sidebar.menu.mail.log",
    icon: "material-symbols:history",
    path: "/admin/mail/log",
    parentId: 3,
    sort: 2,
    business: "admin.mail.log",
  },
  {
    id: 6,
    name: "sidebar.menu.mail.send",
    icon: "material-symbols:send",
    path: "/admin/mail/send",
    parentId: 3,
    sort: 3,
    business: "admin.mail.action",
  },
  {
    id: 7,
    name: "sidebar.menu.mail.account",
    icon: "material-symbols:manage-accounts",
    path: "/admin/mail/account",
    parentId: 3,
    sort: 4,
    business: "admin.mail.account",
  },
  {
    id: 8,
    name: "sidebar.menu.system",
    icon: "material-symbols:settings",
    parentId: 42,
    sort: 1,
    business: "admin.system",
  },
  {
    id: 9,
    name: "sidebar.menu.system.role",
    icon: "material-symbols:supervisor-account",
    path: "/admin/system/role",
    parentId: 8,
    sort: 1,
    business: "admin.system.role",
  },
  {
    id: 10,
    name: "sidebar.menu.user",
    icon: "material-symbols:group",
    path: "/admin/system/user",
    parentId: 8,
    sort: 2,
    business: "admin.system.user",
  },
  {
    id: 11,
    name: "sidebar.menu.system.department",
    icon: "material-symbols:groups",
    path: "/admin/system/department",
    parentId: 8,
    sort: 3,
    business: "admin.system.department",
  },
  {
    id: 12,
    name: "sidebar.menu.menu",
    icon: "material-symbols:menu",
    path: "/admin/system/menu",
    parentId: 8,
    sort: 4,
    business: "admin.system.menu",
  },
  {
    id: 13,
    name: "sidebar.menu.i18n",
    icon: "material-symbols:language",
    parentId: 42,
    sort: 4,
    business: "admin.i18n",
  },
  {
    id: 14,
    name: "sidebar.menu.language",
    icon: "material-symbols:language-international",
    path: "/admin/i18n/language",
    parentId: 13,
    sort: 1,
    business: "admin.i18n.language",
  },
  {
    id: 15,
    name: "sidebar.menu.translation",
    icon: "material-symbols:translate",
    path: "/admin/i18n/translation",
    parentId: 13,
    sort: 2,
    business: "admin.i18n.translation",
  },
  {
    id: 16,
    name: "sidebar.menu.i18n.region",
    icon: "material-symbols:public",
    path: "/admin/i18n/region",
    parentId: 13,
    sort: 3,
    business: "admin.i18n.region",
  },
  {
    id: 17,
    name: "sidebar.menu.system.permission",
    icon: "material-symbols:lock",
    path: "/admin/system/permission",
    parentId: 8,
    sort: 5,
    business: "admin.system.permission",
  },
  {
    id: 18,
    name: "sidebar.menu.system.rolePermission",
    icon: "material-symbols:admin-panel-settings",
    path: "/admin/system/role_permission",
    parentId: 8,
    sort: 6,
    business: "admin.system.role_permission",
  },
  {
    id: 19,
    name: "sidebar.menu.maintenance",
    icon: "material-symbols:build",
    parentId: 42,
    sort: 5,
    business: "admin.maintenance",
  },
  {
    id: 20,
    name: "sidebar.menu.maintenance.cache",
    icon: "material-symbols:database",
    path: "/admin/maintenance/cache",
    parentId: 19,
    sort: 1,
    business: "admin.maintenance.cache",
  },
  {
    id: 21,
    name: "sidebar.menu.maintenance.openapi",
    icon: "material-symbols:api",
    path: "/admin/maintenance/openapi",
    parentId: 19,
    sort: 2,
    business: "admin.maintenance",
  },
  {
    id: 22,
    name: "sidebar.menu.maintenance.loginLog",
    icon: "material-symbols:history-edu",
    path: "/admin/maintenance/loginLog",
    parentId: 19,
    sort: 3,
    business: "admin.maintenance.login_log",
  },
  {
    id: 35,
    name: "sidebar.menu.maintenance.cron",
    icon: "material-symbols:alarm",
    path: "/admin/maintenance/cron",
    parentId: 19,
    sort: 4,
    business: "admin.maintenance.cron",
  },
  {
    id: 37,
    name: "sidebar.menu.maintenance.apiTask",
    icon: "material-symbols:http",
    path: "/admin/maintenance/api-task",
    parentId: 19,
    sort: 5,
    business: "admin.maintenance.api_task",
  },
  {
    id: 38,
    name: "sidebar.menu.maintenance.apiDocs",
    icon: "material-symbols:api",
    path: "/admin/maintenance/api-docs",
    parentId: 19,
    sort: 6,
    business: "admin.maintenance.api_docs",
  },
  {
    id: 23,
    name: "sidebar.menu.oss",
    icon: "material-symbols:cloud",
    parentId: 42,
    sort: 2,
    business: "admin.oss.config",
  },
  {
    id: 24,
    name: "sidebar.menu.oss.config",
    icon: "material-symbols:settings-suggest",
    path: "/admin/oss/config",
    parentId: 23,
    sort: 1,
    business: "admin.oss.config",
  },
  {
    id: 25,
    name: "sidebar.menu.oss.file",
    icon: "material-symbols:folder-shared",
    path: "/admin/oss/file",
    parentId: 23,
    sort: 2,
    business: "admin.oss.file",
  },
  {
    id: 26,
    name: "sidebar.menu.enterprise",
    icon: "material-symbols:enterprise",
    sort: 4,
    business: "enterprise",
  },
  {
    id: 60,
    name: "sidebar.menu.enterprise.mail",
    icon: "material-symbols:mail",
    parentId: 26,
    sort: 8,
    business: "enterprise.mail",
  },
  {
    id: 61,
    name: "sidebar.menu.enterprise.mail.edm",
    icon: "material-symbols:mark-email-read",
    path: "/enterprise/mail/edm",
    parentId: 60,
    sort: 1,
    business: "enterprise.mail.edm",
  },
  {
    id: 27,
    name: "sidebar.menu.organization",
    icon: "material-symbols:groups",
    parentId: 26,
    sort: 1,
    business: "organization",
  },
  {
    id: 45,
    name: "sidebar.menu.organization.attendance",
    icon: "material-symbols:calendar-month",
    path: "/enterprise/organization/attendance",
    parentId: 27,
    sort: 1,
    business: "organization.attendance",
  },
  {
    id: 28,
    name: "sidebar.menu.ai",
    icon: "material-symbols:smart-toy",
    parentId: 42,
    sort: 6,
    business: "admin.ai",
  },
  {
    id: 29,
    name: "sidebar.menu.ai.config",
    icon: "material-symbols:settings-input-component",
    path: "/admin/ai/config",
    parentId: 28,
    sort: 1,
    business: "admin.ai.config",
  },
  {
    id: 64,
    name: "sidebar.menu.ai.chat",
    icon: "material-symbols:forum",
    path: "/admin/ai/chat",
    parentId: 28,
    sort: 2,
    business: "admin.ai.chat",
  },
  {
    id: 65,
    name: "sidebar.menu.ai.search",
    icon: "material-symbols:travel-explore",
    path: "/admin/ai/search",
    parentId: 28,
    sort: 3,
    business: "admin.ai.search",
  },
  {
    id: 30,
    name: "sidebar.menu.data.schemaForm",
    icon: "material-symbols:edit-document",
    path: "/admin/data/schema_form",
    parentId: 43,
    sort: 7,
    business: "admin.data.schema_form",
  },
  {
    id: 31,
    name: "sidebar.menu.data.schemaFormData",
    icon: "material-symbols:table-view",
    path: "/admin/data/schema_form_data",
    parentId: 43,
    sort: 1,
    business: "admin.data.schema_form_data",
  },
  {
    id: 32,
    name: "sidebar.menu.swarm",
    icon: "material-symbols:dns",
    parentId: 42,
    sort: 8,
    business: "admin.swarm",
  },
  {
    id: 33,
    name: "sidebar.menu.swarm.docker",
    icon: "material-symbols:layers",
    path: "/admin/swarm/docker",
    parentId: 32,
    sort: 1,
    business: "admin.swarm.docker",
  },
  {
    id: 34,
    name: "sidebar.menu.swarm.nodes",
    icon: "material-symbols:lan",
    path: "/admin/swarm/nodes",
    parentId: 32,
    sort: 2,
    business: "admin.swarm.nodes",
  },
  {
    id: 36,
    name: "sidebar.menu.swarm.dockerConfig",
    icon: "material-symbols:settings-ethernet",
    path: "/admin/swarm/docker_config",
    parentId: 32,
    sort: 3,
    business: "admin.swarm.docker_config",
  },
  {
    id: 39,
    name: "sidebar.menu.executive",
    icon: "material-symbols:account-tree",
    parentId: 26,
    sort: 2,
    business: "executive",
  },
  {
    id: 40,
    name: "sidebar.menu.executive.workflow",
    icon: "material-symbols:schema",
    path: "/enterprise/executive/workflow",
    parentId: 39,
    sort: 1,
    business: "executive.workflow",
  },
  {
    id: 44,
    name: "sidebar.menu.admin.rpa",
    icon: "material-symbols:robot",
    parentId: 42,
    sort: 7,
    business: "admin.rpa",
  },
  {
    id: 41,
    name: "sidebar.menu.admin.rpa.config",
    icon: "material-symbols:settings-input-component",
    path: "/admin/rpa/config",
    parentId: 44,
    sort: 1,
    business: "admin.rpa.config",
  },
  {
    id: 47,
    name: "sidebar.menu.personal",
    icon: "material-symbols:person",
    sort: 5,
    business: "personal",
  },
  {
    id: 62,
    name: "sidebar.menu.personal.base",
    icon: "material-symbols:settings-account-box",
    parentId: 47,
    sort: 2,
    business: "personal.base",
  },
  {
    id: 63,
    name: "sidebar.menu.personal.base.preference",
    icon: "material-symbols:mark-email-unread",
    path: "/personal/base/preference",
    parentId: 62,
    sort: 1,
    business: "personal.base.preference",
  },
  {
    id: 70,
    name: "sidebar.menu.personal.health",
    icon: "material-symbols:monitor-heart",
    path: "/personal/health",
    parentId: 47,
    sort: 1,
    business: "personal.health",
  },
  {
    id: 71,
    name: "sidebar.menu.personal.finance",
    icon: "material-symbols:account-balance-wallet",
    path: "/personal/finance",
    parentId: 47,
    sort: 2,
    business: "personal.finance",
  },
  {
    id: 72,
    name: "sidebar.menu.personal.family",
    icon: "material-symbols:family-restroom",
    path: "/personal/family",
    parentId: 47,
    sort: 3,
    business: "personal.family",
  },
  {
    id: 73,
    name: "sidebar.menu.personal.social",
    icon: "material-symbols:hub",
    path: "/personal/social",
    parentId: 47,
    sort: 4,
    business: "personal.social",
  },
  {
    id: 49,
    name: "sidebar.menu.admin.base",
    icon: "material-symbols:settings-applications",
    parentId: 42,
    sort: 8,
    business: "admin.base",
  },
  {
    id: 50,
    name: "sidebar.menu.admin.base.config",
    icon: "material-symbols:tune",
    path: "/admin/base/sys_config",
    parentId: 49,
    sort: 1,
    business: "admin.base.sys_config",
  },
  {
    id: 51,
    name: "sidebar.menu.admin.base.log",
    icon: "material-symbols:history",
    path: "/admin/base/log",
    parentId: 49,
    sort: 2,
    business: "admin.base.log",
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
 * 准备菜单数据同步语句
 */
export async function prepareMenu(options?: { reset?: boolean }) {
  const stats = {
    total: initialMenuData.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };
  const queries: any[] = [];

  if (options?.reset) {
    queries.push(db.delete(menuTable));
  }

  const creatorId = SUPER_ADMIN_ID;

  const mappedData = initialMenuData.map((item) => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    sort: item.sort,
    path: item.path || null,
    parentId: item.parentId || null,
    business: item.business || null,
    isEnabled: true,
    creatorId,
  }));
  // 获取所有合法的 ID
  const validIds = initialMenuData.map((item) => item.id);

  if (validIds.length > 0) {
    // 获取当前所有菜单 ID
    const existing = await db.select({ id: menuTable.id }).from(menuTable);
    const idsToDelete = existing
      .map((row) => row.id)
      .filter((id) => !validIds.includes(id));

    if (idsToDelete.length > 0) {
      const DELETE_BATCH = 100;
      for (let i = 0; i < idsToDelete.length; i += DELETE_BATCH) {
        const chunk = idsToDelete.slice(i, i + DELETE_BATCH);
        queries.push(db.delete(menuTable).where(inArray(menuTable.id, chunk)));
      }
    }
  }

  // 基于 ID 执行 Upsert，使用 db.batch() 合并请求
  const BATCH_SIZE = 10;
  for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
    const batch = mappedData.slice(i, i + BATCH_SIZE);
    queries.push(
      db
        .insert(menuTable)
        .values(batch)
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
        })
    );
  }

  stats.created = mappedData.length;

  return { queries, stats };
}
