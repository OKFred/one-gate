import { BusinessError } from "@/middleware/errorHandler/businessError";
import db from "@/db/index";
import { translationTable } from "./model";
import { and, eq, ne } from "drizzle-orm";
import hasValue from "@/utils/hasValue";

/**
 * 翻译模块错误码映射
 * 必须同步在 src/db/initTranslation.ts 中补全翻译
 */
export const ErrorCodes = {
  DUPLICATE_T_KEY: "errorHandler.i18n.translation.duplicateTKey",
} as const;

/**
 * 禁止在同一语言下创建/更新重复的翻译键 (tKey + langCode)
 */
export const preventDuplicateTKey = async (
  obj: { tKey?: string; langCode?: string },
  excludeId?: number
): Promise<void> => {
  if (!hasValue(obj.tKey) || !hasValue(obj.langCode)) return;
  const existing = await db
    .select({ id: translationTable.id })
    .from(translationTable)
    .where(
      and(
        eq(translationTable.tKey, obj.tKey!),
        eq(translationTable.langCode, obj.langCode!),
        excludeId !== undefined ? ne(translationTable.id, excludeId) : undefined
      )
    )
    .limit(1);
  if (existing.length > 0) {
    throw new BusinessError(ErrorCodes.DUPLICATE_T_KEY);
  }
};
