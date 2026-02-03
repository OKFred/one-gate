/**
 * 权限种子数据
 * 用于初始化系统基础权限
 */

import db from "@/db/index";
import { permissionTable } from "@/api/system/permission/db.table";
import { count } from "drizzle-orm";
import { PermissionAddLike } from "@/api/system/permission/service";

/**
 * 基础权限种子数据
 */
const permissionSeeds: Partial<PermissionAddLike>[] = [
  {
    code: "api:SystemAuth",
    name: "auth.title",
    category: "api",
    business: "SystemAuth",
  },
  {
    code: "api:SystemUser",
    name: "user.title",
    category: "api",
    business: "SystemUser",
  },
  {
    code: "api:SystemRole",
    name: "role.title",
    category: "api",
    business: "SystemRole",
  },
  {
    code: "api:SystemPermission",
    name: "permission.title",
    category: "api",
    business: "SystemPermission",
  },
  {
    code: "api:SystemRolePermission",
    name: "rolePermission.title",
    category: "api",
    business: "SystemRolePermission",
  },
  {
    code: "api:SystemDepartment",
    name: "department.title",
    category: "api",
    business: "SystemDepartment",
  },
  {
    code: "api:SystemMenu",
    name: "menu.title",
    category: "api",
    business: "SystemMenu",
  },
  {
    code: "api:I18nLanguage",
    name: "language.title",
    category: "api",
    business: "I18nLanguage",
  },
  {
    code: "api:I18nRegion",
    name: "region.title",
    category: "api",
    business: "I18nRegion",
  },
  {
    code: "api:I18nTranslation",
    name: "translation.title",
    category: "api",
    business: "I18nTranslation",
  },
  {
    code: "api:MailAccount",
    name: "account.title",
    category: "api",
    business: "MailAccount",
  },
  {
    code: "api:MailTemplate",
    name: "template.title",
    category: "api",
    business: "MailTemplate",
  },
  {
    code: "api:MailLog",
    name: "log.title",
    category: "api",
    business: "MailLog",
  },
  {
    code: "api:MailAction",
    name: "send.title",
    category: "api",
    business: "MailAction",
  },
  {
    code: "button:user:add",
    name: "添加用户按钮",
    category: "button",
    business: "SystemUser",
  },
  {
    code: "button:user:edit",
    name: "编辑用户按钮",
    category: "button",
    business: "SystemUser",
  },
  {
    code: "button:user:delete",
    name: "删除用户按钮",
    category: "button",
    business: "SystemUser",
  },
  {
    code: "button:user:export",
    name: "导出用户按钮",
    category: "button",
    business: "SystemUser",
  },
  {
    code: "button:role:add",
    name: "添加角色按钮",
    category: "button",
    business: "SystemRole",
  },
  {
    code: "button:role:edit",
    name: "编辑角色按钮",
    category: "button",
    business: "SystemRole",
  },
  {
    code: "button:role:delete",
    name: "删除角色按钮",
    category: "button",
    business: "SystemRole",
  },
  {
    code: "button:permission:add",
    name: "添加权限按钮",
    category: "button",
    business: "SystemPermission",
  },
  {
    code: "button:permission:edit",
    name: "编辑权限按钮",
    category: "button",
    business: "SystemPermission",
  },
  {
    code: "button:permission:delete",
    name: "删除权限按钮",
    category: "button",
    business: "SystemPermission",
  },
  {
    code: "button:department:add",
    name: "添加部门按钮",
    category: "button",
    business: "SystemDepartment",
  },
  {
    code: "button:department:edit",
    name: "编辑部门按钮",
    category: "button",
    business: "SystemDepartment",
  },
  {
    code: "button:department:delete",
    name: "删除部门按钮",
    category: "button",
    business: "SystemDepartment",
  },
  {
    code: "button:menu:add",
    name: "添加菜单按钮",
    category: "button",
    business: "SystemMenu",
  },
  {
    code: "button:menu:edit",
    name: "编辑菜单按钮",
    category: "button",
    business: "SystemMenu",
  },
  {
    code: "button:menu:delete",
    name: "删除菜单按钮",
    category: "button",
    business: "SystemMenu",
  },
  {
    code: "button:role-permission:add",
    name: "添加角色权限按钮",
    category: "button",
    business: "SystemRolePermission",
  },
  {
    code: "button:role-permission:edit",
    name: "编辑角色权限按钮",
    category: "button",
    business: "SystemRolePermission",
  },
  {
    code: "button:role-permission:delete",
    name: "删除角色权限按钮",
    category: "button",
    business: "SystemRolePermission",
  },
  {
    code: "button:role-permission:batch-delete",
    name: "批量删除角色权限按钮",
    category: "button",
    business: "SystemRolePermission",
  },
  {
    code: "button:language:add",
    name: "添加语言按钮",
    category: "button",
    business: "I18nLanguage",
  },
  {
    code: "button:language:edit",
    name: "编辑语言按钮",
    category: "button",
    business: "I18nLanguage",
  },
  {
    code: "button:language:delete",
    name: "删除语言按钮",
    category: "button",
    business: "I18nLanguage",
  },
  {
    code: "button:region:add",
    name: "添加地区按钮",
    category: "button",
    business: "I18nRegion",
  },
  {
    code: "button:region:edit",
    name: "编辑地区按钮",
    category: "button",
    business: "I18nRegion",
  },
  {
    code: "button:region:delete",
    name: "删除地区按钮",
    category: "button",
    business: "I18nRegion",
  },
  {
    code: "button:translation:add",
    name: "添加翻译按钮",
    category: "button",
    business: "I18nTranslation",
  },
  {
    code: "button:translation:edit",
    name: "编辑翻译按钮",
    category: "button",
    business: "I18nTranslation",
  },
  {
    code: "button:translation:delete",
    name: "删除翻译按钮",
    category: "button",
    business: "I18nTranslation",
  },
  {
    code: "button:mail-account:add",
    name: "添加邮件账户按钮",
    category: "button",
    business: "MailAccount",
  },
  {
    code: "button:mail-account:edit",
    name: "编辑邮件账户按钮",
    category: "button",
    business: "MailAccount",
  },
  {
    code: "button:mail-account:delete",
    name: "删除邮件账户按钮",
    category: "button",
    business: "MailAccount",
  },
  {
    code: "button:mail-template:add",
    name: "添加邮件模板按钮",
    category: "button",
    business: "MailTemplate",
  },
  {
    code: "button:mail-template:edit",
    name: "编辑邮件模板按钮",
    category: "button",
    business: "MailTemplate",
  },
  {
    code: "button:mail-template:delete",
    name: "删除邮件模板按钮",
    category: "button",
    business: "MailTemplate",
  },
  {
    code: "button:mail-log:view",
    name: "查看邮件日志按钮",
    category: "button",
    business: "MailLog",
  },
  {
    code: "button:profile:edit",
    name: "编辑个人信息按钮",
    category: "button",
    business: "SystemUser",
  },
  {
    code: "button:profile:change-password",
    name: "修改密码按钮",
    category: "button",
    business: "SystemUser",
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
    const creatorId = 1; // 系统初始化
    const insertedPermissions: { id: number; code: string }[] = [];

    for (const seed of permissionSeeds) {
      const result = await db
        .insert(permissionTable)
        .values({
          code: seed.code,
          name: seed.name,
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
