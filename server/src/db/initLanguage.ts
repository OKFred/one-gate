import { languageTable } from "@/api/infra/i18n/language/model";
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
] as const;

export type LanguageCode = (typeof initialLanguageData)[number]["langCode"];

/**
 * 准备语言数据同步语句
 */
export async function prepareLanguage(options?: { reset?: boolean }) {
  const stats = {
    total: initialLanguageData.length,
    created: 0,
    updated: 0,
    skipped: 0,
  };
  const queries: any[] = [];

  if (options?.reset) {
    queries.push(db.delete(languageTable));
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
    queries.push(
      db
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
    );
    stats.created++;
  }

  return { queries, stats };
}
