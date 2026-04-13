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
  {
    category: "api",
    code: "system.auth:api",
    business: "system.auth",
  },
  {
    category: "api",
    code: "system.user:api",
    business: "system.user",
  },
  {
    category: "api",
    code: "system.role:api",
    business: "system.role",
  },
  {
    category: "api",
    code: "system.permission:api",
    business: "system.permission",
  },
  {
    category: "api",
    code: "system.role_permission:api",
    business: "system.role_permission",
  },
  {
    category: "api",
    code: "system.department:api",
    business: "system.department",
  },
  {
    category: "api",
    code: "system.menu:api",
    business: "system.menu",
  },
  {
    category: "api",
    code: "i18n.language:api",
    business: "i18n.language",
  },
  {
    category: "api",
    code: "i18n.region:api",
    business: "i18n.region",
  },
  {
    category: "api",
    code: "i18n.translation:api",
    business: "i18n.translation",
  },
  {
    category: "api",
    code: "maintenance.cache:api",
    business: "maintenance.cache",
  },
  {
    category: "api",
    code: "maintenance.audit_login:api",
    business: "maintenance.audit_login",
  },
  {
    category: "api",
    code: "mail.account:api",
    business: "mail.account",
  },
  {
    category: "api",
    code: "mail.template:api",
    business: "mail.template",
  },
  {
    category: "api",
    code: "mail.log:api",
    business: "mail.log",
  },
  {
    category: "api",
    code: "mail.action:api",
    business: "mail.action",
  },
  {
    category: "button",
    code: "system.user:add",
    business: "system.user",
  },
  {
    category: "button",
    code: "system.user:edit",
    business: "system.user",
  },
  {
    category: "button",
    code: "system.user:delete",
    business: "system.user",
  },
  {
    category: "button",
    code: "system.user:export",
    business: "system.user",
  },
  {
    category: "button",
    code: "system.role:add",
    business: "system.role",
  },
  {
    category: "button",
    code: "system.role:edit",
    business: "system.role",
  },
  {
    category: "button",
    code: "system.role:delete",
    business: "system.role",
  },
  {
    category: "button",
    code: "system.permission:add",
    business: "system.permission",
  },
  {
    category: "button",
    code: "system.permission:edit",
    business: "system.permission",
  },
  {
    category: "button",
    code: "system.permission:delete",
    business: "system.permission",
  },
  {
    category: "button",
    code: "system.department:add",
    business: "system.department",
  },
  {
    category: "button",
    code: "system.department:edit",
    business: "system.department",
  },
  {
    category: "button",
    code: "system.department:delete",
    business: "system.department",
  },
  {
    category: "button",
    code: "system.menu:add",
    business: "system.menu",
  },
  {
    category: "button",
    code: "system.menu:edit",
    business: "system.menu",
  },
  {
    category: "button",
    code: "system.menu:delete",
    business: "system.menu",
  },
  {
    category: "button",
    code: "system.role_permission:add",
    business: "system.role_permission",
  },
  {
    category: "button",
    code: "system.role_permission:edit",
    business: "system.role_permission",
  },
  {
    category: "button",
    code: "system.role_permission:delete",
    business: "system.role_permission",
  },
  {
    category: "button",
    code: "system.role_permission:batch-delete",
    business: "system.role_permission",
  },
  {
    category: "button",
    code: "i18n.language:add",
    business: "i18n.language",
  },
  {
    category: "button",
    code: "i18n.language:edit",
    business: "i18n.language",
  },
  {
    category: "button",
    code: "i18n.language:delete",
    business: "i18n.language",
  },
  {
    category: "button",
    code: "i18n.region:add",
    business: "i18n.region",
  },
  {
    category: "button",
    code: "i18n.region:edit",
    business: "i18n.region",
  },
  {
    category: "button",
    code: "i18n.region:delete",
    business: "i18n.region",
  },
  {
    category: "button",
    code: "i18n.translation:add",
    business: "i18n.translation",
  },
  {
    category: "button",
    code: "i18n.translation:edit",
    business: "i18n.translation",
  },
  {
    category: "button",
    code: "i18n.translation:delete",
    business: "i18n.translation",
  },
  {
    category: "button",
    code: "mail.account:add",
    business: "mail.account",
  },
  {
    category: "button",
    code: "mail.account:edit",
    business: "mail.account",
  },
  {
    category: "button",
    code: "mail.account:delete",
    business: "mail.account",
  },
  {
    category: "button",
    code: "mail.template:add",
    business: "mail.template",
  },
  {
    category: "button",
    code: "mail.template:edit",
    business: "mail.template",
  },
  {
    category: "button",
    code: "mail.template:delete",
    business: "mail.template",
  },
  {
    category: "button",
    code: "mail.log:view",
    business: "mail.log",
  },
  {
    category: "button",
    code: "system.auth:update_profile",
    business: "system.auth",
  },
  {
    category: "button",
    code: "system.auth:update_password",
    business: "system.auth",
  },
  {
    category: "button",
    code: "maintenance.cache:add",
    business: "maintenance.cache",
  },
  {
    category: "button",
    code: "maintenance.cache:edit",
    business: "maintenance.cache",
  },
  {
    category: "button",
    code: "maintenance.cache:delete",
    business: "maintenance.cache",
  },
  {
    category: "button",
    code: "maintenance.cache:view",
    business: "maintenance.cache",
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
    const getAPIName = () => {
      const tKeySubString = seed.code!.replace(":api", "");
      const trans = initialTranslationData.find(
        (item) => item.tKey === "businessType." + tKeySubString
      );
      const prefix = trans?.langCodes?.[LOCALE] || trans?.tValue;

      const postfixTrans = initialTranslationData.find(
        (item) => item.tKey === "permission.category.api"
      );
      const postfix = postfixTrans?.langCodes?.[LOCALE] || postfixTrans?.tValue;

      return prefix && postfix ? `${prefix}${postfix}` : seed.code + "未知接口";
    };

    const getButtonName = () => {
      const [tKeySubString, action] = seed.code!.split(":");
      const trans = initialTranslationData.find(
        (item) => item.tKey === "businessType." + tKeySubString
      );
      const prefix = trans?.langCodes?.[LOCALE] || trans?.tValue;

      const postfixTrans = initialTranslationData.find(
        (item) => item.tKey === "permission.category.button"
      );
      const postfix = postfixTrans?.langCodes?.[LOCALE] || postfixTrans?.tValue;

      return prefix && postfix
        ? `${prefix}${postfix}:${action}`
        : seed.code + "未知按钮";
    };

    const name =
      seed.category === "api"
        ? getAPIName()
        : seed.category === "button"
          ? getButtonName()
          : "未知权限";

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
