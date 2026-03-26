import { initMenu } from "./initMenu";
import { initTranslation } from "./initTranslation";
import { initCountryRegion } from "./initRegion";
import { initLanguage } from "./initLanguage";
import { loadTranslationCache } from "@/utils/i18n";
import { getEnv } from "@/utils/env";
import { initPermissions } from "./initPermissions";
import { initSuperAdminRole, initSuperAdminUser } from "./initUserAndRole";

export const SUPER_ADMIN_ID = 1;
export const SUPER_ADMIN_ROLE_ID = 1;

// 超级管理员配置
export const SUPER_ADMIN = {
  username: getEnv("SUPER_ADMIN_USERNAME") || "superadmin",
  password: getEnv("SUPER_ADMIN_PASSWORD") || "Admin@123456",
  langCode: getEnv("LOCALE"),
  roleId: SUPER_ADMIN_ROLE_ID,
};

// 超级管理员角色配置
export const SUPER_ADMIN_ROLE = {
  name: "超级管理员",
  isEnabled: true,
  creatorId: SUPER_ADMIN_ID,
  remark: "系统初始化创建的超级管理员角色，拥有所有权限",
  dataScope: "all" as const,
};

/**
 * 初始化数据库数据
 */
export async function initDatabase() {
  try {
    console.log("⌛ 开始初始化数据库...");

    // 初始化超级管理员角色
    const roleId = await initSuperAdminRole();

    // 初始化超级管理员账号
    await initSuperAdminUser(roleId);

    // 初始化语言
    await initLanguage();

    // 初始化多语言
    await initTranslation();

    // 加载多语言缓存
    await loadTranslationCache();

    // 初始化权限数据
    await initPermissions();

    // 初始化国家地区
    await initCountryRegion();

    // 初始化菜单
    await initMenu();
    console.log("✅ 数据库初始化完成");
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    throw error;
  }
}

export default initDatabase;
