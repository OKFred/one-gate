import { BusinessError } from "@/middleware/errorHandler/businessError";
import db from "@/db/index";
import { regionTable } from "./model";
import { and, eq, ne, or } from "drizzle-orm";
import hasValue from "@/utils/hasValue";

/**
 * 国家地区模块错误码映射
 * 必须同步在 src/db/initTranslation.ts 中补全翻译
 */
export const ErrorCodes = {
  DUPLICATE_CODE: "errorHandler.i18n.region.duplicateCode",
} as const;

/**
 * 禁止创建/更新重复的国家地区代码 (alpha2、alpha3、numeric)
 */
export const preventDuplicateRegionCode = async (
  obj: {
    alpha2Code?: string | null;
    alpha3Code?: string | null;
    numeric?: number | null;
  },
  excludeId?: number
): Promise<void> => {
  const conditions = [] as any[];
  if (hasValue(obj.alpha2Code)) {
    conditions.push(eq(regionTable.alpha2Code, obj.alpha2Code!));
  }
  if (hasValue(obj.alpha3Code)) {
    conditions.push(eq(regionTable.alpha3Code, obj.alpha3Code!));
  }
  if (hasValue(obj.numeric)) {
    conditions.push(eq(regionTable.numeric, obj.numeric!));
  }
  if (conditions.length === 0) return;

  const matchClause =
    conditions.length === 1 ? conditions[0] : or(...conditions);
  const records = await db
    .select({ id: regionTable.id })
    .from(regionTable)
    .where(
      and(
        matchClause,
        excludeId !== undefined ? ne(regionTable.id, excludeId) : undefined
      )
    )
    .limit(1);
  if (records.length > 0) {
    throw new BusinessError(ErrorCodes.DUPLICATE_CODE);
  }
};
