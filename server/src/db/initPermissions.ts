/**
 * 权限种子数据
 * 用于初始化系统基础权限
 */

import db from "@/db/index";
import { permissionTable } from "@/api/system/permission/db.table";
import { count } from "drizzle-orm";

interface PermissionSeed {
  code: string;
  name: string;
  type: "menu" | "button" | "api";
  resource?: string;
  effect?: "allow" | "deny";
  scope?: "all" | "own" | "dept" | "custom";
  parentId?: number | null;
  remark?: string;
}

/**
 * 基础权限种子数据
 */
const permissionSeeds: PermissionSeed[] = [
  // ==================== 菜单权限 ====================
  {
    code: "menu:dashboard",
    name: "仪表盘菜单",
    type: "menu",
    resource: "/dashboard",
    remark: "系统首页仪表盘",
  },
  {
    code: "menu:system",
    name: "系统管理菜单",
    type: "menu",
    resource: "/system",
    remark: "系统管理菜单入口",
  },
  {
    code: "menu:system:user",
    name: "用户管理菜单",
    type: "menu",
    resource: "/system/user",
    remark: "用户管理页面",
  },
  {
    code: "menu:system:role",
    name: "角色管理菜单",
    type: "menu",
    resource: "/system/role",
    remark: "角色管理页面",
  },
  {
    code: "menu:system:permission",
    name: "权限管理菜单",
    type: "menu",
    resource: "/system/permission",
    remark: "权限管理页面",
  },
  {
    code: "menu:system:department",
    name: "部门管理菜单",
    type: "menu",
    resource: "/system/department",
    remark: "部门管理页面",
  },

  // ==================== 用户管理权限 ====================
  {
    code: "user:read",
    name: "查看用户",
    type: "api",
    resource: "/api/system/user/list",
    scope: "all",
    remark: "查看用户列表和详情",
  },
  {
    code: "user:write",
    name: "编辑用户",
    type: "api",
    resource: "/api/system/user/update",
    scope: "all",
    remark: "创建和编辑用户",
  },
  {
    code: "user:delete",
    name: "删除用户",
    type: "api",
    resource: "/api/system/user/delete",
    scope: "all",
    remark: "删除用户",
  },
  {
    code: "button:user:add",
    name: "添加用户按钮",
    type: "button",
    remark: "用户管理页面的添加按钮",
  },
  {
    code: "button:user:edit",
    name: "编辑用户按钮",
    type: "button",
    remark: "用户管理页面的编辑按钮",
  },
  {
    code: "button:user:delete",
    name: "删除用户按钮",
    type: "button",
    remark: "用户管理页面的删除按钮",
  },
  {
    code: "button:user:export",
    name: "导出用户按钮",
    type: "button",
    remark: "导出用户数据按钮",
  },

  // ==================== 角色管理权限 ====================
  {
    code: "role:read",
    name: "查看角色",
    type: "api",
    resource: "/api/system/role/list",
    scope: "all",
    remark: "查看角色列表和详情",
  },
  {
    code: "role:write",
    name: "编辑角色",
    type: "api",
    resource: "/api/system/role/update",
    scope: "all",
    remark: "创建和编辑角色",
  },
  {
    code: "role:delete",
    name: "删除角色",
    type: "api",
    resource: "/api/system/role/delete",
    scope: "all",
    remark: "删除角色",
  },
  {
    code: "button:role:add",
    name: "添加角色按钮",
    type: "button",
    remark: "角色管理页面的添加按钮",
  },
  {
    code: "button:role:edit",
    name: "编辑角色按钮",
    type: "button",
    remark: "角色管理页面的编辑按钮",
  },
  {
    code: "button:role:delete",
    name: "删除角色按钮",
    type: "button",
    remark: "角色管理页面的删除按钮",
  },

  // ==================== 权限管理权限 ====================
  {
    code: "permission:read",
    name: "查看权限",
    type: "api",
    resource: "/api/system/permission/list",
    scope: "all",
    remark: "查看权限列表和详情",
  },
  {
    code: "permission:write",
    name: "编辑权限",
    type: "api",
    resource: "/api/system/permission/update",
    scope: "all",
    remark: "创建和编辑权限",
  },
  {
    code: "permission:delete",
    name: "删除权限",
    type: "api",
    resource: "/api/system/permission/delete",
    scope: "all",
    remark: "删除权限",
  },
  {
    code: "button:permission:add",
    name: "添加权限按钮",
    type: "button",
    remark: "权限管理页面的添加按钮",
  },
  {
    code: "button:permission:edit",
    name: "编辑权限按钮",
    type: "button",
    remark: "权限管理页面的编辑按钮",
  },
  {
    code: "button:permission:delete",
    name: "删除权限按钮",
    type: "button",
    remark: "权限管理页面的删除按钮",
  },

  // ==================== 部门管理权限 ====================
  {
    code: "department:read",
    name: "查看部门",
    type: "api",
    resource: "/api/system/department/list",
    scope: "all",
    remark: "查看部门列表和详情",
  },
  {
    code: "department:write",
    name: "编辑部门",
    type: "api",
    resource: "/api/system/department/update",
    scope: "all",
    remark: "创建和编辑部门",
  },
  {
    code: "department:delete",
    name: "删除部门",
    type: "api",
    resource: "/api/system/department/delete",
    scope: "all",
    remark: "删除部门",
  },
  {
    code: "button:department:add",
    name: "添加部门按钮",
    type: "button",
    remark: "部门管理页面的添加按钮",
  },
  {
    code: "button:department:edit",
    name: "编辑部门按钮",
    type: "button",
    remark: "部门管理页面的编辑按钮",
  },
  {
    code: "button:department:delete",
    name: "删除部门按钮",
    type: "button",
    remark: "部门管理页面的删除按钮",
  },

  // ==================== 系统管理权限 ====================
  {
    code: "system:admin",
    name: "系统管理员",
    type: "api",
    resource: "/api/system/*",
    scope: "all",
    remark: "系统管理员完全权限",
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
          type: seed.type,
          resource: seed.resource || null,
          effect: seed.effect || "allow",
          scope: seed.scope || "all",
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

/**
 * 添加自定义权限
 * @param permissions 权限数组
 */
export async function addCustomPermissions(permissions: PermissionSeed[]) {
  const creatorId = 1;
  const inserted: number[] = [];

  for (const seed of permissions) {
    try {
      const result = await db
        .insert(permissionTable)
        .values({
          code: seed.code,
          name: seed.name,
          type: seed.type,
          resource: seed.resource || null,
          effect: seed.effect || "allow",
          scope: seed.scope || "all",
          parentId: seed.parentId || null,
          remark: seed.remark || null,
          isEnabled: true,
          creatorId,
        })
        .returning({ id: permissionTable.id });

      if (result[0]) {
        inserted.push(result[0].id);
      }
    } catch (error) {
      console.error(`插入权限失败 ${seed.code}:`, error);
    }
  }

  return inserted;
}

export default {
  initPermissions,
  addCustomPermissions,
  permissionSeeds,
};
