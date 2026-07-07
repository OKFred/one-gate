import db from "./index";
import { menuTable } from "../../../infra/src/system/menu/model";
import { permissionTable } from "../../../infra/src/system/permission/model";
import { sql } from "drizzle-orm";
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
    id: 42,
    name: "sidebar.menu.infra",
    icon: "material-symbols:construction",
    sort: 3,
    business: "infra",
  },
  {
    id: 43,
    name: "sidebar.menu.data",
    icon: "material-symbols:database",
    parentId: 42,
    sort: 2,
    business: "data",
  },
  {
    id: 3,
    name: "sidebar.menu.mail",
    icon: "material-symbols:mail",
    parentId: 42,
    sort: 3,
    business: "mail",
  },
  {
    id: 4,
    name: "sidebar.menu.mail.template",
    icon: "material-symbols:description",
    path: "/infra/mail/template",
    parentId: 3,
    sort: 1,
    business: "mail.template",
  },
  {
    id: 5,
    name: "sidebar.menu.mail.log",
    icon: "material-symbols:history",
    path: "/infra/mail/log",
    parentId: 3,
    sort: 2,
    business: "mail.log",
  },
  {
    id: 6,
    name: "sidebar.menu.mail.send",
    icon: "material-symbols:send",
    path: "/infra/mail/send",
    parentId: 3,
    sort: 3,
    business: "mail.action",
  },
  {
    id: 7,
    name: "sidebar.menu.mail.account",
    icon: "material-symbols:manage-accounts",
    path: "/infra/mail/account",
    parentId: 3,
    sort: 4,
    business: "mail.account",
  },
  {
    id: 8,
    name: "sidebar.menu.system",
    icon: "material-symbols:settings",
    parentId: 42,
    sort: 1,
    business: "system",
  },
  {
    id: 9,
    name: "sidebar.menu.system.role",
    icon: "material-symbols:supervisor-account",
    path: "/infra/system/role",
    parentId: 8,
    sort: 1,
    business: "system.role",
  },
  {
    id: 10,
    name: "sidebar.menu.user",
    icon: "material-symbols:group",
    path: "/infra/system/user",
    parentId: 8,
    sort: 2,
    business: "system.user",
  },
  {
    id: 11,
    name: "sidebar.menu.system.department",
    icon: "material-symbols:groups",
    path: "/infra/system/department",
    parentId: 8,
    sort: 3,
    business: "system.department",
  },
  {
    id: 12,
    name: "sidebar.menu.menu",
    icon: "material-symbols:menu",
    path: "/infra/system/menu",
    parentId: 8,
    sort: 4,
    business: "system.menu",
  },
  {
    id: 13,
    name: "sidebar.menu.i18n",
    icon: "material-symbols:language",
    parentId: 42,
    sort: 4,
    business: "i18n",
  },
  {
    id: 14,
    name: "sidebar.menu.language",
    icon: "material-symbols:language-international",
    path: "/infra/i18n/language",
    parentId: 13,
    sort: 1,
    business: "i18n.language",
  },
  {
    id: 15,
    name: "sidebar.menu.translation",
    icon: "material-symbols:translate",
    path: "/infra/i18n/translation",
    parentId: 13,
    sort: 2,
    business: "i18n.translation",
  },
  {
    id: 16,
    name: "sidebar.menu.i18n.region",
    icon: "material-symbols:public",
    path: "/infra/i18n/region",
    parentId: 13,
    sort: 3,
    business: "i18n.region",
  },
  {
    id: 17,
    name: "sidebar.menu.system.permission",
    icon: "material-symbols:lock",
    path: "/infra/system/permission",
    parentId: 8,
    sort: 5,
    business: "system.permission",
  },
  {
    id: 18,
    name: "sidebar.menu.system.rolePermission",
    icon: "material-symbols:admin-panel-settings",
    path: "/infra/system/role_permission",
    parentId: 8,
    sort: 6,
    business: "system.role_permission",
  },
  {
    id: 19,
    name: "sidebar.menu.maintenance",
    icon: "material-symbols:build",
    parentId: 42,
    sort: 5,
    business: "maintenance",
  },
  {
    id: 20,
    name: "sidebar.menu.maintenance.cache",
    icon: "material-symbols:database",
    path: "/infra/maintenance/cache",
    parentId: 19,
    sort: 1,
    business: "maintenance.cache",
  },
  {
    id: 21,
    name: "sidebar.menu.maintenance.openapi",
    icon: "material-symbols:api",
    path: "/infra/maintenance/openapi",
    parentId: 19,
    sort: 2,
    business: "maintenance",
  },
  {
    id: 22,
    name: "sidebar.menu.maintenance.auditLogin",
    icon: "material-symbols:history-edu",
    path: "/infra/maintenance/auditLogin",
    parentId: 19,
    sort: 3,
    business: "maintenance.audit_login",
  },
  {
    id: 35,
    name: "sidebar.menu.maintenance.cron",
    icon: "material-symbols:alarm",
    path: "/infra/maintenance/cron",
    parentId: 19,
    sort: 4,
    business: "maintenance.cron",
  },
  {
    id: 37,
    name: "sidebar.menu.maintenance.apiTask",
    icon: "material-symbols:http",
    path: "/infra/maintenance/api-task",
    parentId: 19,
    sort: 5,
    business: "maintenance.api_task",
  },
  {
    id: 38,
    name: "sidebar.menu.maintenance.apiDocs",
    icon: "material-symbols:api",
    path: "/infra/maintenance/api-docs",
    parentId: 19,
    sort: 6,
    business: "maintenance.api_docs",
  },
  {
    id: 23,
    name: "sidebar.menu.oss",
    icon: "material-symbols:cloud",
    parentId: 43,
    sort: 2,
    business: "data.oss.config",
  },
  {
    id: 24,
    name: "sidebar.menu.oss.config",
    icon: "material-symbols:settings-suggest",
    path: "/infra/data/oss/config",
    parentId: 23,
    sort: 1,
    business: "data.oss.config",
  },
  {
    id: 25,
    name: "sidebar.menu.oss.file",
    icon: "material-symbols:folder-shared",
    path: "/infra/data/oss/file",
    parentId: 23,
    sort: 2,
    business: "data.oss.file",
  },
  {
    id: 26,
    name: "sidebar.menu.enterprise",
    icon: "material-symbols:enterprise",
    sort: 4,
    business: "enterprise",
  },
  {
    id: 27,
    name: "sidebar.menu.enterprise.attendance",
    icon: "material-symbols:calendar-month",
    path: "/biz/enterprise/attendance",
    parentId: 26,
    sort: 1,
    business: "enterprise.attendance",
  },
  {
    id: 28,
    name: "sidebar.menu.ai",
    icon: "material-symbols:smart-toy",
    sort: 5,
    business: "ai",
  },
  {
    id: 29,
    name: "sidebar.menu.ai.config",
    icon: "material-symbols:settings-input-component",
    path: "/biz/ai/config",
    parentId: 28,
    sort: 1,
    business: "ai.config",
  },
  {
    id: 30,
    name: "sidebar.menu.data.schemaForm",
    icon: "material-symbols:edit-document",
    path: "/infra/data/schema_form",
    parentId: 43,
    sort: 7,
    business: "data.schema_form",
  },
  {
    id: 31,
    name: "sidebar.menu.data.schemaFormData",
    icon: "material-symbols:table-view",
    path: "/infra/data/schema_form_data",
    parentId: 43,
    sort: 1,
    business: "data.schema_form_data",
  },
  {
    id: 32,
    name: "sidebar.menu.swarm",
    icon: "material-symbols:dns",
    parentId: 42,
    sort: 6,
    business: "swarm",
  },
  {
    id: 33,
    name: "sidebar.menu.swarm.docker",
    icon: "material-symbols:layers",
    path: "/infra/swarm/docker",
    parentId: 32,
    sort: 1,
    business: "swarm.docker",
  },
  {
    id: 34,
    name: "sidebar.menu.swarm.nodes",
    icon: "material-symbols:lan",
    path: "/infra/swarm/nodes",
    parentId: 32,
    sort: 2,
    business: "swarm.nodes",
  },
  {
    id: 36,
    name: "sidebar.menu.swarm.dockerConfig",
    icon: "material-symbols:settings-ethernet",
    path: "/infra/swarm/docker_config",
    parentId: 32,
    sort: 3,
    business: "swarm.docker_config",
  },
  {
    id: 39,
    name: "sidebar.menu.enterprise.workflowGroup",
    icon: "material-symbols:account-tree",
    parentId: 26,
    sort: 2,
    business: "enterprise",
  },
  {
    id: 40,
    name: "sidebar.menu.enterprise.workflow",
    icon: "material-symbols:schema",
    path: "/biz/enterprise/workflow",
    parentId: 39,
    sort: 1,
    business: "enterprise.workflow",
  },
  {
    id: 41,
    name: "sidebar.menu.enterprise.workflowConfig",
    icon: "material-symbols:settings-input-component",
    path: "/biz/enterprise/workflow/config",
    parentId: 39,
    sort: 2,
    business: "enterprise.workflow_config",
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
    icon: item.icon || null,
    sort: item.sort,
    path: item.path || null,
    parentId: item.parentId || null,
    business: item.business || null,
    isEnabled: true,
    creatorId,
  }));

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
