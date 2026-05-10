import { BusinessError } from "@/middleware/errorHandler/businessError";
import db from "@/db/index";
import { ossConfigTable } from "./model";
import { and, eq, ne } from "drizzle-orm";
import hasValue from "@/utils/hasValue";

/**
 * 存储配置模块错误码映射
 */
export const ErrorCodes = {
  DUPLICATE_NAME: "errorHandler.oss.config.duplicateName",
  INIT_FAILED: "errorHandler.oss.config.initFailed",
} as const;

/**
 * 禁止创建/更新重复的配置名称
 */
export const preventDuplicateName = async (
  name: string,
  excludeId?: number
): Promise<void> => {
  if (!hasValue(name)) return;
  const records = await db
    .select({ id: ossConfigTable.id })
    .from(ossConfigTable)
    .where(
      and(
        eq(ossConfigTable.name, name),
        excludeId !== undefined ? ne(ossConfigTable.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (records.length > 0) {
    throw new BusinessError(ErrorCodes.DUPLICATE_NAME);
  }
};

/**
 * 确保存储实例能够成功初始化
 */
export const preventStorageInitFailure = (storage: any): void => {
  if (!storage) {
    throw new BusinessError(ErrorCodes.INIT_FAILED);
  }
};
