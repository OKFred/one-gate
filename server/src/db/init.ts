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
export async function initDatabase(options?: { reset?: boolean }) {
  try {
    console.log("⌛ 开始初始化数据库 (模式: " + (options?.reset ? "重置" : "同步") + ")...");
    const results: Record<string, any> = {};

    // 1. 初始化超级管理员角色
    const roleResult = await initSuperAdminRole(options);
    results.superAdminRole = roleResult.stats;
    const roleId = roleResult.id;

    // 2. 初始化超级管理员账号
    const userResult = await initSuperAdminUser(roleId, options);
    results.superAdminUser = userResult.stats;

    // 3. 初始化语言
    results.language = await initLanguage(options);

    // 4. 初始化多语言
    results.translation = await initTranslation(options);

    // 加载多语言缓存 (必须在语言和翻译初始化之后)
    await loadTranslationCache();

    // 5. 初始化权限数据
    results.permissions = await initPermissions(options);

    // 6. 初始化国家地区
    results.countryRegion = await initCountryRegion(options);

    // 7. 初始化菜单
    results.menu = await initMenu(options);

    console.log("✅ 数据库初始化完成");
    return results;
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    throw error;
  }
}

export default initDatabase;
