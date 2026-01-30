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
    code: "/api/v1/system",
    name: "系统管理接口",
    category: "api",
    effect: "allow",
    scope: "all",
    remark: "系统相关接口",
  },
  {
    code: "/^\\/api\\/v1\\/mail(?!.*account).*$/",
    name: "邮件服务接口(排除账户相关)",
    category: "api",
    effect: "allow",
    scope: "all",
    remark: "邮件相关接口，但不包括账户相关接口",
  },
  // ==================== 菜单权限 ====================
  {
    code: "menu:dashboard",
    name: "仪表盘菜单",
    category: "menu",
    resource: "/dashboard",
    remark: "系统首页仪表盘",
  },
  {
    code: "menu:system",
    name: "系统管理菜单",
    category: "menu",
    resource: "/system",
    remark: "系统管理菜单入口",
  },
  {
    code: "menu:system:user",
    name: "用户管理菜单",
    category: "menu",
    resource: "/system/user",
    remark: "用户管理页面",
  },
  {
    code: "menu:system:role",
    name: "角色管理菜单",
    category: "menu",
    resource: "/system/role",
    remark: "角色管理页面",
  },
  {
    code: "menu:system:permission",
    name: "权限管理菜单",
    category: "menu",
    resource: "/system/permission",
    remark: "权限管理页面",
  },
  {
    code: "menu:system:department",
    name: "部门管理菜单",
    category: "menu",
    resource: "/system/department",
    remark: "部门管理页面",
  },

  // ==================== 用户管理权限 ====================
  {
    code: "button:user:add",
    name: "添加用户按钮",
    category: "button",
    remark: "用户管理页面的添加按钮",
  },
  {
    code: "button:user:edit",
    name: "编辑用户按钮",
    category: "button",
    remark: "用户管理页面的编辑按钮",
  },
  {
    code: "button:user:delete",
    name: "删除用户按钮",
    category: "button",
    remark: "用户管理页面的删除按钮",
  },
  {
    code: "button:user:export",
    name: "导出用户按钮",
    category: "button",
    remark: "导出用户数据按钮",
  },

  // ==================== 角色管理权限 ====================
  {
    code: "button:role:add",
    name: "添加角色按钮",
    category: "button",
    remark: "角色管理页面的添加按钮",
  },
  {
    code: "button:role:edit",
    name: "编辑角色按钮",
    category: "button",
    remark: "角色管理页面的编辑按钮",
  },
  {
    code: "button:role:delete",
    name: "删除角色按钮",
    category: "button",
    remark: "角色管理页面的删除按钮",
  },

  // ==================== 权限管理权限 ====================
  {
    code: "button:permission:add",
    name: "添加权限按钮",
    category: "button",
    remark: "权限管理页面的添加按钮",
  },
  {
    code: "button:permission:edit",
    name: "编辑权限按钮",
    category: "button",
    remark: "权限管理页面的编辑按钮",
  },
  {
    code: "button:permission:delete",
    name: "删除权限按钮",
    category: "button",
    remark: "权限管理页面的删除按钮",
  },

  // ==================== 部门管理权限 ====================
  {
    code: "button:department:add",
    name: "添加部门按钮",
    category: "button",
    remark: "部门管理页面的添加按钮",
  },
  {
    code: "button:department:edit",
    name: "编辑部门按钮",
    category: "button",
    remark: "部门管理页面的编辑按钮",
  },
  {
    code: "button:department:delete",
    name: "删除部门按钮",
    category: "button",
    remark: "部门管理页面的删除按钮",
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
          effect: seed.effect,
          scope: seed.scope,
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
