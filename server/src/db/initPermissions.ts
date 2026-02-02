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
  // ==================== API权限 ====================
  {
    code: "SystemAuth",
    name: "系统鉴权接口",
    category: "api",
    scope: "all",
  },
  {
    code: "SystemUser",
    name: "系统用户接口",
    category: "api",
    scope: "all",
  },
  {
    code: "SystemRole",
    name: "系统角色接口",
    category: "api",
    scope: "all",
  },
  {
    code: "SystemPermission",
    name: "系统权限接口",
    category: "api",
    scope: "all",
  },
  {
    code: "SystemRolePermission",
    name: "系统角色权限接口",
    category: "api",
    scope: "all",
  },
  {
    code: "SystemDepartment",
    name: "系统部门接口",
    category: "api",
    scope: "all",
  },
  {
    code: "SystemMenu",
    name: "系统菜单接口",
    category: "api",
    scope: "all",
  },
  {
    code: "I18nLanguage",
    name: "国际化语言接口",
    category: "api",
    scope: "all",
  },
  {
    code: "I18nRegion",
    name: "国际化地区接口",
    category: "api",
    scope: "all",
  },
  {
    code: "I18nTranslation",
    name: "国际化翻译接口",
    category: "api",
    scope: "all",
  },
  {
    code: "MailAccount",
    name: "邮件账户接口",
    category: "api",
    scope: "all",
  },
  {
    code: "MailTemplate",
    name: "邮件模板接口",
    category: "api",
    scope: "all",
  },
  {
    code: "MailLog",
    name: "邮件日志接口",
    category: "api",
    scope: "all",
  },
  {
    code: "MailAction",
    name: "邮件操作接口",
    category: "api",
    scope: "all",
  },
  // ==================== 用户管理权限 ====================
  {
    code: "button:user:add",
    name: "添加用户按钮",
    category: "button",
  },
  {
    code: "button:user:edit",
    name: "编辑用户按钮",
    category: "button",
  },
  {
    code: "button:user:delete",
    name: "删除用户按钮",
    category: "button",
  },
  {
    code: "button:user:export",
    name: "导出用户按钮",
    category: "button",
  },

  // ==================== 角色管理权限 ====================
  {
    code: "button:role:add",
    name: "添加角色按钮",
    category: "button",
  },
  {
    code: "button:role:edit",
    name: "编辑角色按钮",
    category: "button",
  },
  {
    code: "button:role:delete",
    name: "删除角色按钮",
    category: "button",
  },

  // ==================== 权限管理权限 ====================
  {
    code: "button:permission:add",
    name: "添加权限按钮",
    category: "button",
  },
  {
    code: "button:permission:edit",
    name: "编辑权限按钮",
    category: "button",
  },
  {
    code: "button:permission:delete",
    name: "删除权限按钮",
    category: "button",
  },

  // ==================== 部门管理权限 ====================
  {
    code: "button:department:add",
    name: "添加部门按钮",
    category: "button",
  },
  {
    code: "button:department:edit",
    name: "编辑部门按钮",
    category: "button",
  },
  {
    code: "button:department:delete",
    name: "删除部门按钮",
    category: "button",
  },

  // ==================== 菜单管理权限 ====================
  {
    code: "button:menu:add",
    name: "添加菜单按钮",
    category: "button",
  },
  {
    code: "button:menu:edit",
    name: "编辑菜单按钮",
    category: "button",
  },
  {
    code: "button:menu:delete",
    name: "删除菜单按钮",
    category: "button",
  },

  // ==================== 角色权限管理权限 ====================
  {
    code: "button:role-permission:add",
    name: "添加角色权限按钮",
    category: "button",
  },
  {
    code: "button:role-permission:edit",
    name: "编辑角色权限按钮",
    category: "button",
  },
  {
    code: "button:role-permission:delete",
    name: "删除角色权限按钮",
    category: "button",
  },
  {
    code: "button:role-permission:batch-delete",
    name: "批量删除角色权限按钮",
    category: "button",
  },

  // ==================== 国际化 - 语言管理权限 ====================
  {
    code: "button:language:add",
    name: "添加语言按钮",
    category: "button",
  },
  {
    code: "button:language:edit",
    name: "编辑语言按钮",
    category: "button",
  },
  {
    code: "button:language:delete",
    name: "删除语言按钮",
    category: "button",
  },

  // ==================== 国际化 - 地区管理权限 ====================
  {
    code: "button:region:add",
    name: "添加地区按钮",
    category: "button",
  },
  {
    code: "button:region:edit",
    name: "编辑地区按钮",
    category: "button",
  },
  {
    code: "button:region:delete",
    name: "删除地区按钮",
    category: "button",
  },

  // ==================== 国际化 - 翻译管理权限 ====================
  {
    code: "button:translation:add",
    name: "添加翻译按钮",
    category: "button",
  },
  {
    code: "button:translation:edit",
    name: "编辑翻译按钮",
    category: "button",
  },
  {
    code: "button:translation:delete",
    name: "删除翻译按钮",
    category: "button",
  },

  // ==================== 邮件 - 账户管理权限 ====================
  {
    code: "button:mail-account:add",
    name: "添加邮件账户按钮",
    category: "button",
  },
  {
    code: "button:mail-account:edit",
    name: "编辑邮件账户按钮",
    category: "button",
  },
  {
    code: "button:mail-account:delete",
    name: "删除邮件账户按钮",
    category: "button",
  },

  // ==================== 邮件 - 模板管理权限 ====================
  {
    code: "button:mail-template:add",
    name: "添加邮件模板按钮",
    category: "button",
  },
  {
    code: "button:mail-template:edit",
    name: "编辑邮件模板按钮",
    category: "button",
  },
  {
    code: "button:mail-template:delete",
    name: "删除邮件模板按钮",
    category: "button",
  },

  // ==================== 邮件 - 日志管理权限 ====================
  {
    code: "button:mail-log:view",
    name: "查看邮件日志按钮",
    category: "button",
  },

  // ==================== 个人信息管理权限 ====================
  {
    code: "button:profile:edit",
    name: "编辑个人信息按钮",
    category: "button",
  },
  {
    code: "button:profile:change-password",
    name: "修改密码按钮",
    category: "button",
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
          effect: seed.effect || "allow",
          scope: seed.scope || "all",
          resource: seed.resource || null,
          parentId: seed.parentId || null,
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
