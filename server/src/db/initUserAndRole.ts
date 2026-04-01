import db from "@/db/index";
import { hashPassword } from "@/utils/crypto";
import { sql, eq } from "drizzle-orm";
import { userTable } from "@/api/system/user/model";
import { roleTable } from "@/api/system/role/model";
import {
  SUPER_ADMIN_ROLE_ID,
  SUPER_ADMIN,
  SUPER_ADMIN_ID,
  SUPER_ADMIN_ROLE,
} from "./init";

/**
 * 初始化超级管理员角色
 */
export async function initSuperAdminRole(options?: { reset?: boolean }) {
  const stats = { total: 1, created: 0, updated: 0, skipped: 0 };
  try {
    if (options?.reset) {
      await db.delete(roleTable).where(eq(roleTable.id, SUPER_ADMIN_ROLE_ID));
      console.log("🗑️  已重置超级管理员角色");
    }

    // 使用 Upsert
    const result = await db
      .insert(roleTable)
      .values({ ...SUPER_ADMIN_ROLE, id: SUPER_ADMIN_ROLE_ID })
      .onConflictDoUpdate({
        target: roleTable.id,
        set: {
          name: SUPER_ADMIN_ROLE.name,
          isEnabled: SUPER_ADMIN_ROLE.isEnabled,
          dataScope: SUPER_ADMIN_ROLE.dataScope,
        },
      })
      .returning({ id: roleTable.id });

    stats.created = 1;
    console.log(`✅ 超级管理员角色同步成功 (ID: ${result[0].id})`);
    return { id: result[0].id, stats };
  } catch (error) {
    console.error("❌ 超级管理员角色初始化失败:", error);
    throw error;
  }
}

/**
 * 初始化超级管理员账号
 */
export async function initSuperAdminUser(
  roleId: number,
  options?: { reset?: boolean }
) {
  const stats = { total: 1, created: 0, updated: 0, skipped: 0 };
  try {
    if (options?.reset) {
      await db
        .delete(userTable)
        .where(eq(userTable.username, SUPER_ADMIN.username));
      console.log("🗑️  已重置超级管理员账号");
    }

    // 加密密码
    const hashedPassword = await hashPassword(SUPER_ADMIN.password);

    // 使用 Upsert
    const result = await db
      .insert(userTable)
      .values({
        username: SUPER_ADMIN.username,
        password: hashedPassword,
        langCode: SUPER_ADMIN.langCode,
        roleIdArr: [roleId],
        isEnabled: true,
        creatorId: SUPER_ADMIN_ID,
        remark: "系统初始化创建的超级管理员账号",
      })
      .onConflictDoUpdate({
        target: userTable.username,
        set: {
          password: hashedPassword,
          langCode: SUPER_ADMIN.langCode,
          roleIdArr: sql`excluded.role_id_arr`,
          isEnabled: true,
        },
      })
      .returning({ id: userTable.id });

    stats.created = 1;
    console.log(`✅ 超级管理员账号同步成功 (用户名: ${SUPER_ADMIN.username})`);
    return { id: result[0].id, stats };
  } catch (error) {
    console.error("超级管理员账号初始化失败:", error);
    throw error;
  }
}
