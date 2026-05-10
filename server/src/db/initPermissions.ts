/**
 * 权限种子数据
 * 用于初始化系统基础权限
 */

import db from "@/db/index";
import { permissionTable } from "@/api/system/permission/model";
import { PermissionAddLike } from "@/api/system/permission/service";
import { initialTranslationData } from "./initTranslation";
import { SUPER_ADMIN_ID } from "./init";
import { getEnv } from "@/utils/env";
import { sql } from "drizzle-orm";
const LOCALE = getEnv("LOCALE") || "zh-CN";

/**
 * 基础权限种子数据
 */
const permissionSeeds: Partial<PermissionAddLike>[] = [
  // system.user
  { category: "action", code: "system.user:read", business: "system.user" },
  { category: "action", code: "system.user:add", business: "system.user" },
  { category: "action", code: "system.user:edit", business: "system.user" },
  { category: "action", code: "system.user:delete", business: "system.user" },
  { category: "action", code: "system.user:export", business: "system.user" },

  // system.role
  { category: "action", code: "system.role:read", business: "system.role" },
  { category: "action", code: "system.role:add", business: "system.role" },
  { category: "action", code: "system.role:edit", business: "system.role" },
  { category: "action", code: "system.role:delete", business: "system.role" },

  // system.permission
  {
    category: "action",
    code: "system.permission:read",
    business: "system.permission",
  },
  {
    category: "action",
    code: "system.permission:add",
    business: "system.permission",
  },
  {
    category: "action",
    code: "system.permission:edit",
    business: "system.permission",
  },
  {
    category: "action",
    code: "system.permission:delete",
    business: "system.permission",
  },

  // system.department
  {
    category: "action",
    code: "system.department:read",
    business: "system.department",
  },
  {
    category: "action",
    code: "system.department:add",
    business: "system.department",
  },
  {
    category: "action",
    code: "system.department:edit",
    business: "system.department",
  },
  {
    category: "action",
    code: "system.department:delete",
    business: "system.department",
  },

  // system.menu
  { category: "action", code: "system.menu:read", business: "system.menu" },
  { category: "action", code: "system.menu:add", business: "system.menu" },
  { category: "action", code: "system.menu:edit", business: "system.menu" },
  { category: "action", code: "system.menu:delete", business: "system.menu" },

  // system.role_permission
  {
    category: "action",
    code: "system.role_permission:read",
    business: "system.role_permission",
  },
  {
    category: "action",
    code: "system.role_permission:add",
    business: "system.role_permission",
  },
  {
    category: "action",
    code: "system.role_permission:edit",
    business: "system.role_permission",
  },
  {
    category: "action",
    code: "system.role_permission:delete",
    business: "system.role_permission",
  },
  {
    category: "action",
    code: "system.role_permission:batch-delete",
    business: "system.role_permission",
  },

  // i18n.language
  { category: "action", code: "i18n.language:read", business: "i18n.language" },
  { category: "action", code: "i18n.language:add", business: "i18n.language" },
  { category: "action", code: "i18n.language:edit", business: "i18n.language" },
  {
    category: "action",
    code: "i18n.language:delete",
    business: "i18n.language",
  },

  // i18n.region
  { category: "action", code: "i18n.region:read", business: "i18n.region" },
  { category: "action", code: "i18n.region:add", business: "i18n.region" },
  { category: "action", code: "i18n.region:edit", business: "i18n.region" },
  { category: "action", code: "i18n.region:delete", business: "i18n.region" },

  // i18n.translation
  {
    category: "action",
    code: "i18n.translation:read",
    business: "i18n.translation",
  },
  {
    category: "action",
    code: "i18n.translation:add",
    business: "i18n.translation",
  },
  {
    category: "action",
    code: "i18n.translation:edit",
    business: "i18n.translation",
  },
  {
    category: "action",
    code: "i18n.translation:delete",
    business: "i18n.translation",
  },

  // mail.account
  { category: "action", code: "mail.account:read", business: "mail.account" },
  { category: "action", code: "mail.account:add", business: "mail.account" },
  { category: "action", code: "mail.account:edit", business: "mail.account" },
  { category: "action", code: "mail.account:delete", business: "mail.account" },

  // mail.template
  { category: "action", code: "mail.template:read", business: "mail.template" },
  { category: "action", code: "mail.template:add", business: "mail.template" },
  { category: "action", code: "mail.template:edit", business: "mail.template" },
  {
    category: "action",
    code: "mail.template:delete",
    business: "mail.template",
  },

  // mail.log
  { category: "action", code: "mail.log:read", business: "mail.log" },
  { category: "action", code: "mail.log:view", business: "mail.log" },

  // system.auth
  {
    category: "action",
    code: "system.auth:update_profile",
    business: "system.auth",
  },
  {
    category: "action",
    code: "system.auth:update_password",
    business: "system.auth",
  },

  // maintenance.cache
  {
    category: "action",
    code: "maintenance.cache:read",
    business: "maintenance.cache",
  },
  {
    category: "action",
    code: "maintenance.cache:add",
    business: "maintenance.cache",
  },
  {
    category: "action",
    code: "maintenance.cache:edit",
    business: "maintenance.cache",
  },
  {
    category: "action",
    code: "maintenance.cache:delete",
    business: "maintenance.cache",
  },
  {
    category: "action",
    code: "maintenance.cache:view",
    business: "maintenance.cache",
  },

  // maintenance.audit_login
  {
    category: "action",
    code: "maintenance.audit_login:read",
    business: "maintenance.audit_login",
  },

  // enterprise.attendance
  {
    category: "action",
    code: "enterprise.attendance:read",
    business: "enterprise.attendance",
  },
  {
    category: "action",
    code: "enterprise.attendance:add",
    business: "enterprise.attendance",
  },
  {
    category: "action",
    code: "enterprise.attendance:edit",
    business: "enterprise.attendance",
  },
  {
    category: "action",
    code: "enterprise.attendance:delete",
    business: "enterprise.attendance",
  },
];

/**
 * 准备系统权限数据同步语句
 */
export async function preparePermissions(options?: { reset?: boolean }) {
  const stats = {
    total: permissionSeeds.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };

  const queries: any[] = [];

  if (options?.reset) {
    queries.push(db.delete(permissionTable));
  }

  const creatorId = SUPER_ADMIN_ID; // 系统初始化

  // 准备数据
  const mappedData = permissionSeeds.map((seed) => {
    const getActionName = () => {
      const [tKeySubString, action] = seed.code!.split(":");
      const trans = initialTranslationData.find(
        (item) => item.tKey === "businessType." + tKeySubString
      );
      const prefix = trans?.langCodes?.[LOCALE];

      // fallback 简单的多语言翻译
      const actionNameMap: Record<string, string> = {
        read: "查看",
        list: "列表",
        add: "新增",
        edit: "编辑",
        delete: "删除",
        export: "导出",
        view: "浏览",
        "batch-delete": "批量删除",
        update_profile: "更新资料",
        update_password: "更新密码",
      };

      const actionName = actionNameMap[action] || action;
      return prefix ? `${prefix}-${actionName}` : seed.code + "未知动作";
    };

    const name = seed.category === "action" ? getActionName() : "未知权限";

    return {
      code: seed.code!,
      name,
      category: seed.category!,
      resource: seed.resource || null,
      business: seed.business || null,
      remark: seed.remark || null,
      isEnabled: true,
      creatorId,
    };
  });

  // 分批执行以规避 SQL 变量限制
  const BATCH_SIZE = 10;
  for (let i = 0; i < mappedData.length; i += BATCH_SIZE) {
    const batch = mappedData.slice(i, i + BATCH_SIZE);
    queries.push(
      db
        .insert(permissionTable)
        .values(batch as any)
        .onConflictDoUpdate({
          target: permissionTable.code,
          set: {
            name: sql`excluded.name`,
            category: sql`excluded.category`,
            resource: sql`excluded.resource`,
            business: sql`excluded.business`,
          },
        })
    );
  }

  stats.created = mappedData.length;
  return { queries, stats };
}

export default {
  preparePermissions,
};
