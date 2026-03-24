import { languageTable } from "@/api/i18n/language/model";
import db from "@/db/index";
import { count } from "drizzle-orm";
import { SUPER_ADMIN_ID } from "./init";

export const initialLanguageData = [
  {
    langCode: "zh-CN",
    nativeName: "中文（中国）",
    isEnabled: true,
    sortOrder: 1,
  },
  {
    langCode: "en-US",
    nativeName: "English (US)",
    isEnabled: true,
    sortOrder: 2,
  },
];

/**
 * 初始化语言数据
 */
export async function initLanguage() {
  try {
    const countResult = await db
      .select({ total: count(languageTable.id).as("total") })
      .from(languageTable);
    if (countResult[0]?.total > 0) {
      console.log("ℹ️  语言数据已存在，跳过初始化");
      return;
    }

    const mappedData = initialLanguageData.map((item) => ({
      langCode: item.langCode,
      nativeName: item.nativeName,
      isEnabled: item.isEnabled,
      sortOrder: item.sortOrder,
      remark: null,
      creatorId: SUPER_ADMIN_ID,
    }));

    await db.insert(languageTable).values(mappedData);
    console.log(`💾 表 i18n_language 初始数据已插入 (${mappedData.length} 条)`);
  } catch (error) {
    console.error("❌ 语言数据初始化失败:", error);
    throw error;
  }
}
