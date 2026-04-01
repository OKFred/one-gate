import { languageTable } from "@/api/i18n/language/model";
import db from "@/db/index";
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
export async function initLanguage(options?: { reset?: boolean }) {
  const stats = {
    total: initialLanguageData.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };
  try {
    if (options?.reset) {
      await db.delete(languageTable);
      console.log("🗑️  已重置语言数据表");
    }

    const mappedData = initialLanguageData.map((item) => ({
      langCode: item.langCode,
      nativeName: item.nativeName,
      isEnabled: item.isEnabled,
      sortOrder: item.sortOrder,
      remark: null,
      creatorId: SUPER_ADMIN_ID,
    }));

    for (const data of mappedData) {
      await db
        .insert(languageTable)
        .values(data)
        .onConflictDoUpdate({
          target: languageTable.langCode,
          set: {
            nativeName: data.nativeName,
            isEnabled: data.isEnabled,
            sortOrder: data.sortOrder,
          },
        })
        .returning({ id: languageTable.id });

      // Note: In SQLite returning might not distinguish between insert/update easily without extra checks
      // But for stats we can just count them.
      stats.created++;
    }

    console.log(`💾 语言数据初始化完成: ${stats.total} 条记录已同步`);
    return stats;
  } catch (error) {
    console.error("❌ 语言数据初始化失败:", error);
    throw error;
  }
}
