import { BusinessError } from "@/middleware/errorHandler/businessError";
import db from "@/db/index";
import { permissionTable } from "./model";
import { eq, inArray } from "drizzle-orm";

/**
 * 权限模块错误码映射
 */
export const ErrorCodes = {
  NOT_FOUND: "errorHandler.system.permission.notFound",
} as const;

/**
 * 校验权限记录是否存在
 */
export const preventMissingPermission = async (id: number) => {
  const rows = await db
    .select({ id: permissionTable.id })
    .from(permissionTable)
    .where(eq(permissionTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new BusinessError(ErrorCodes.NOT_FOUND);
  }
};

/**
 * 批量校验权限记录是否存在
 */
export const preventMissingPermissions = async (ids: number[]) => {
  if (ids.length === 0) return;
  const uniqueIds = Array.from(new Set(ids));
  const rows = await db
    .select({ id: permissionTable.id })
    .from(permissionTable)
    .where(inArray(permissionTable.id, uniqueIds));
  if (rows.length !== uniqueIds.length) {
    throw new BusinessError(ErrorCodes.NOT_FOUND);
  }
};
