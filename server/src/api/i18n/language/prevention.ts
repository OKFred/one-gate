import { BusinessError } from "@/middleware/errorHandler/businessError";
import db from "@/db/index";
import { languageTable } from "./model";
import { and, eq, ne } from "drizzle-orm";
import hasValue from "@/utils/hasValue";

/**
 * 语言模块错误码映射
 * 必须同步在 src/db/initTranslation.ts 中补全翻译
 */
export const ErrorCodes = {
  DUPLICATE_LANG_CODE: "errorHandler.i18n.language.duplicateLangCode",
} as const;

/**
 * 禁止创建/更新重复的语言代码
 */
export const preventDuplicateLangCode = async (
  langCode: string | undefined,
  excludeId?: number
): Promise<void> => {
  if (!hasValue(langCode)) return;
  const records = await db
    .select({ id: languageTable.id })
    .from(languageTable)
    .where(
      and(
        eq(languageTable.langCode, langCode!),
        excludeId !== undefined ? ne(languageTable.id, excludeId) : undefined
      )
    )
    .limit(1);
  if (records.length > 0) {
    throw new BusinessError(ErrorCodes.DUPLICATE_LANG_CODE);
  }
};
