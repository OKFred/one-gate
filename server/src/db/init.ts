import db from "@/db/index";
import bcrypt from "bcrypt";
import { userTable } from "@/api/system/user/db.table";
import { roleTable } from "@/api/system/role/db.table";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

// 超级管理员配置
const SUPER_ADMIN = {
  username: process.env.SUPER_ADMIN_USERNAME || "superadmin",
  password: process.env.SUPER_ADMIN_PASSWORD || "Admin@123456",
  roleId: 1, // 超级管理员角色ID
};

// 超级管理员角色配置
const SUPER_ADMIN_ROLE = {
  id: 1,
  name: "超级管理员",
  description: "系统超级管理员，拥有所有权限",
  permissions: JSON.stringify([
    "system:*",
    "user:*",
    "role:*",
    "department:*",
    "mail:*",
  ]),
  isEnabled: true,
  creatorId: 1, // 系统初始化
};

/**
 * 初始化超级管理员角色
 */
async function initSuperAdminRole() {
  try {
    // 检查超级管理员角色是否已存在
    const existingRole = await db
      .select()
      .from(roleTable)
      .where(eq(roleTable.id, SUPER_ADMIN_ROLE.id))
      .limit(1);

    if (existingRole.length > 0) {
      console.log("ℹ️  超级管理员角色已存在，跳过初始化");
      return SUPER_ADMIN_ROLE.id;
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
async function initSuperAdminUser(roleId: number) {
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
        roleIdArr: [roleId], // 关联超级管理员角色
        isEnabled: true,
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

/**
 * 初始化数据库数据
 */
export async function initDatabase() {
  try {
    console.log("⌛ 开始初始化数据库...");

    // 1. 初始化超级管理员角色
    const roleId = await initSuperAdminRole();

    // 2. 初始化超级管理员账号
    await initSuperAdminUser(roleId);

    console.log("✅ 数据库初始化完成");
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    throw error;
  }
}

export default initDatabase;
