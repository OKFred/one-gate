import db from "./index";
import { prepareMenu } from "./initMenu";
import { prepareTranslation } from "./initTranslation";
import { prepareCountryRegion } from "./initRegion";
import { prepareLanguage } from "./initLanguage";
import { getEnv } from "../utils/env";
import { preparePermissions } from "./initPermissions";
import {
  prepareSuperAdminRole,
  prepareSuperAdminUser,
} from "./initUserAndRole";
import { kv } from "../middleware/cache/index";

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
 * 初始化数据库数据 (全局原子事务模式)
 */
export async function initDatabase(options?: {
  reset?: boolean;
  skipSuper?: boolean;
}) {
  try {
    console.log(
      "⌛ 开始全局原子初始化 (模式: " +
        (options?.reset ? "重置" : "同步") +
        ")..."
    );

    // 1. 异步准备各模块的语句 (耗时操作如密码加密、哈希计算在这里并行或顺序执行)
    const [roleRes, userRes, langRes, transRes, permRes, regionRes, menuRes] =
      await Promise.all([
        !options?.skipSuper
          ? prepareSuperAdminRole(options)
          : { queries: [], stats: {} },
        !options?.skipSuper
          ? prepareSuperAdminUser(SUPER_ADMIN_ROLE_ID, options)
          : { queries: [], stats: {} },
        prepareLanguage(options),
        prepareTranslation(options), // 内部包含异步的 SHA256 计算
        preparePermissions(options),
        prepareCountryRegion(options),
        prepareMenu(options),
      ]);

    // 2. 汇总所有查询语句
    const allQueries = [
      ...roleRes.queries,
      ...userRes.queries,
      ...langRes.queries,
      ...transRes.queries,
      ...permRes.queries,
      ...regionRes.queries,
      ...menuRes.queries,
    ];

    console.log(`📦 正在执行全局 Batch 事务 (${allQueries.length} 条 SQL)...`);

    // 3. 执行单一 Batch 提交 (保证全局事务一致性)
    if (allQueries.length > 0) {
      await db.batch(allQueries as any);
    }

    console.log("✅ 全局原子初始化完成");

    // 触发全局缓存失效，强制刷新所有用户权限
    await kv
      .put("system.auth:global_version", Date.now().toString())
      .catch(() => {});

    // 返回统计汇总
    return {
      superAdminRole: roleRes.stats,
      superAdminUser: userRes.stats,
      language: langRes.stats,
      translation: transRes.stats,
      permissions: permRes.stats,
      countryRegion: regionRes.stats,
      menu: menuRes.stats,
    };
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    throw error;
  }
}

export default initDatabase;
