import db from "@/db/index";
import bcrypt from "bcrypt";
import { count, eq } from "drizzle-orm";
import { userTable } from "@/api/system/user/db.table";
import { roleTable } from "@/api/system/role/db.table";
import { menuTable } from "@/api/system/menu/db.table";
import { initialMenuData } from "@/db/initialMenu";
import { initialI18nData } from "./initI18n";
import { initialRegionData } from "./initRegion";
import { regionTable } from "@/api/i18n/region/db.table";
import translationService, {
  utils as translationUtils,
} from "@/api/i18n/translation/service";
import { loadI18nCache } from "@/utils/i18n";

export const SALT_ROUNDS = 12;
export const SUPER_ADMIN_ID = 1;
export const SUPER_ADMIN_ROLE_ID = 1;

// 超级管理员配置
const SUPER_ADMIN = {
  username: process.env.SUPER_ADMIN_USERNAME || "superadmin",
  password: process.env.SUPER_ADMIN_PASSWORD || "Admin@123456",
  langCode: process.env.LOCALE,
  roleId: 1, // 超级管理员角色ID
};

// 超级管理员角色配置
const SUPER_ADMIN_ROLE = {
  name: "超级管理员",
  permissions: JSON.stringify([
    "system:*",
    "user:*",
    "role:*",
    "department:*",
    "mail:*",
  ]),
  isEnabled: true,
  creatorId: 1, // 系统初始化
  remark: "系统初始化创建的超级管理员角色",
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
        langCode: SUPER_ADMIN.langCode,
        roleIdArr: [roleId], // 关联超级管理员角色
        isEnabled: true,
        creatorId: 1, // 系统初始化
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

/**
 * 初始化菜单
 */
async function initMenu() {
  // 检查是否已有数据，没有则插入初始数据
  const countResult = await db
    .select({ total: count(menuTable.id).as("total") })
    .from(menuTable);
  if (countResult[0]?.total === 0) {
    for (const menu of initialMenuData) {
      await db.insert(menuTable).values({
        id: menu.id,
        name: menu.name,
        icon: menu.icon,
        sort: menu.sort,
        path: menu.path || null,
        parentId: menu.parentId || null,
        roleIdArr: menu.roleIdArr || null,
        isEnabled: true,
        creatorId: 1, // 系统初始化
      });
    }
    console.log("💾 表 system_menu 初始数据已插入");
  }
}

/**
 * 初始化多语言数据
 */
async function initI18n() {
  const userObj = { userId: SUPER_ADMIN_ID }; // 系统初始化用户
  const promises = initialI18nData.map(async (item) => {
    // 计算 hash 值
    const valueHash = await translationUtils.calculateSHA256(item.tValue);
    const params = {
      application: item.application,
      business: item.business,
      langCode: item.langCode,
      tKey: item.tKey,
      tValue: item.tValue,
      valueHash,
      version: 0,
      remark: null,
      isEnabled: item.isEnabled,
    };
    return translationService.add.service(params, userObj, {
      skipCacheReload: true,
    });
  });

  const addResults = await Promise.allSettled(promises);
  const successCount = addResults.filter(
    (res) => res.status === "fulfilled"
  ).length;
  const totalCount = initialI18nData.length;
  console.log(
    `🌐 多语言数据初始化完成: ${successCount}/${totalCount} 条记录已添加`
  );
}

/**
 * 初始化国家地区数据
 */
async function initCountryRegion() {
  try {
    const countResult = await db
      .select({ total: count(regionTable.id).as("total") })
      .from(regionTable);
    if (countResult[0]?.total > 0) {
      console.log("ℹ️  国家地区数据已存在，跳过初始化");
      return;
    }

    const mappedData = initialRegionData.map((item) => ({
      labelZhCN: item.label_zhCN,
      labelEnUS: item.label_enUS,
      alpha2Code: item.alpha2Code,
      alpha3Code: item.alpha3Code,
      numeric: item.numeric,
      iso3166Independent: item.ISO3166Independent,
      isEnabled: true,
      version: 0,
      creatorId: SUPER_ADMIN_ID,
    }));

    const chunkSize = 100;
    for (let i = 0; i < mappedData.length; i += chunkSize) {
      const chunk = mappedData.slice(i, i + chunkSize);
      await db.insert(regionTable).values(chunk);
    }
    console.log(`💾 表 i18n_region 初始数据已插入 (${mappedData.length} 条)`);
  } catch (error) {
    console.error("❌ 国家地区数据初始化失败:", error);
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
    // 3. 初始化菜单
    await initMenu();

    // 4. 初始化多语言
    await initI18n();

    // 5. 加载多语言缓存
    await loadI18nCache();

    // 6. 初始化国家地区
    await initCountryRegion();

    console.log("✅ 数据库初始化完成");
  } catch (error) {
    console.error("❌ 数据库初始化失败:", error);
    throw error;
  }
}

export default initDatabase;
