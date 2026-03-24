/**
 * 权限种子数据
 * 用于初始化系统基础权限
 */

import db from "@/db/index";
import { permissionTable } from "@/api/system/permission/db.table";
import { count } from "drizzle-orm";
import { PermissionAddLike } from "@/api/system/permission/service";
import { initialTranslationData } from "./initTranslation";
import { SUPER_ADMIN_ID } from "./init";
const LOCALE = process.env.LOCALE || "zh-CN";
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
 * 初始化权限数据
 */
export async function initPermissions() {
  console.log("🔐 开始初始化权限数据...");

  try {
    // 检查权限表是否为空
    const countResult = await db
      .select({ total: count(permissionTable.id) })
      .from(permissionTable);
    const existingCount = countResult[0]?.total || 0;

    if (existingCount > 0) {
      console.log(`⚠️  权限表已存在 ${existingCount} 条数据，跳过初始化`);
      return;
    }
    // 插入权限数据
    const creatorId = SUPER_ADMIN_ID; // 系统初始化
    const insertedPermissions: { id: number; code: string }[] = [];

    for (const seed of permissionSeeds) {
      const getAPIName = () => {
        const tKeySubString = seed.code.replace(":api", "");
        const prefix = initialTranslationData.find(
          (item) =>
            item.tKey === "businessType." + tKeySubString &&
            item.langCode === LOCALE
        )?.tValue;
        const postfix = initialTranslationData.find(
          (item) =>
            item.tKey === "permission.category.api" && item.langCode === LOCALE
        )?.tValue;
        return prefix && postfix
          ? `${prefix}${postfix}`
          : seed.code + "未知接口";
      };
      const getButtonName = () => {
        const [tKeySubString, action] = seed.code.split(":");
        const prefix = initialTranslationData.find(
          (item) =>
            item.tKey === "businessType." + tKeySubString &&
            item.langCode === LOCALE
        )?.tValue;
        const postfix = initialTranslationData.find(
          (item) =>
            item.tKey === "permission.category.button" &&
            item.langCode === LOCALE
        )?.tValue;
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
      // console.log(`🔐 正在插入权限: [${seed.code}] ${name}`);
      const result = await db
        .insert(permissionTable)
        .values({
          code: seed.code,
          name,
          category: seed.category,
          resource: seed.resource || null,
          business: seed.business || null,
          remark: seed.remark || null,
          isEnabled: true,
          creatorId,
        })
        .returning({ id: permissionTable.id, code: permissionTable.code });

      if (result[0]) {
        insertedPermissions.push(result[0]);
      }
    }

    console.log(`✅ 成功插入 ${insertedPermissions.length} 条权限数据`);
  } catch (error) {
    console.error("❌ 权限初始化失败:", error);
    throw error;
  }
}

export default {
  initPermissions,
};
