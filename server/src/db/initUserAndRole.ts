import db from "@/db/index";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { userTable } from "@/api/system/user/db.table";
import { roleTable } from "@/api/system/role/db.table";
import {
  SUPER_ADMIN_ROLE_ID,
  SUPER_ADMIN,
  SALT_ROUNDS,
  SUPER_ADMIN_ID,
  SUPER_ADMIN_ROLE,
} from "./init";

/**
 * 初始化超级管理员角色
 */
export async function initSuperAdminRole() {
  try {
    // 检查超级管理员角色是否已存在
    const existingRole = await db
      .select()
      .from(roleTable)
      .where(eq(roleTable.id, SUPER_ADMIN_ROLE_ID))
      .limit(1);

    if (existingRole.length > 0) {
      console.log("ℹ️  超级管理员角色已存在，跳过初始化");
      return SUPER_ADMIN_ROLE_ID;
    }

    // 创建超级管理员角色
    const result = await db
      .insert(roleTable)
      .values(SUPER_ADMIN_ROLE)
      .returning({ id: roleTable.id });

    console.log(`✅ 超级管理员角色初始化成功 (ID: ${result[0].id})`);
    return result[0].id;
  } catch (error) {
    console.error("❌ 超级管理员角色初始化失败:", error);
    throw error;
  }
}

/**
 * 初始化超级管理员账号
 */
export async function initSuperAdminUser(roleId: number) {
  try {
    // 检查超级管理员账号是否已存在
    const existingUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.username, SUPER_ADMIN.username))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("ℹ️  超级管理员账号已存在，跳过初始化");
      return existingUser[0].id;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(SUPER_ADMIN.password, SALT_ROUNDS);

    // 创建超级管理员账号
    const result = await db
      .insert(userTable)
      .values({
        username: SUPER_ADMIN.username,
        password: hashedPassword,
        langCode: SUPER_ADMIN.langCode,
        roleIdArr: [roleId], // 关联超级管理员角色
        isEnabled: true,
        creatorId: SUPER_ADMIN_ID,
        remark: "系统初始化创建的超级管理员账号",
      })
      .returning({ id: userTable.id });

    console.log(
      `✅ 超级管理员账号初始化成功 (用户名: ${SUPER_ADMIN.username})`
    );
    console.log(`⚠️ 默认密码: ${SUPER_ADMIN.password?.replace(/./g, "*")}`);
    console.log(`⚠️  请在首次登录后立即修改密码！`);
    return result[0].id;
  } catch (error) {
    console.error("超级管理员账号初始化失败:", error);
    throw error;
  }
}
