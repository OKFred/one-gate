import { BusinessError } from "@/middleware/errorHandler/businessError";
import db from "@/db";
import { rolePermissionTable } from "./model";
import { roleTable } from "../role/model";
import { permissionTable } from "../permission/model";
import { eq, inArray, and } from "drizzle-orm";

/**
 * 角色权限模块错误码映射
 */
export const ErrorCodes = {
  RECORD_NOT_FOUND: "errorHandler.system.rolePermission.recordNotFound",
  ROLE_NOT_FOUND: "errorHandler.system.rolePermission.roleNotFound",
  PERMISSION_NOT_FOUND: "errorHandler.system.rolePermission.permissionNotFound",
} as const;

/**
 * 校验关联记录是否存在
 */
export const preventMissingRecord = async (id: number) => {
  const rows = await db
    .select({ id: rolePermissionTable.id })
    .from(rolePermissionTable)
    .where(eq(rolePermissionTable.id, id))
    .limit(1);
  if (rows.length === 0) {
    throw new BusinessError(ErrorCodes.RECORD_NOT_FOUND);
  }
};

/**
 * 校验角色是否存在
 */
export const preventMissingRole = async (roleId: number) => {
  const rows = await db
    .select({ id: roleTable.id })
    .from(roleTable)
    .where(eq(roleTable.id, roleId))
    .limit(1);
  if (rows.length === 0) {
    throw new BusinessError(ErrorCodes.ROLE_NOT_FOUND);
  }
};

/**
 * 校验权限是否存在 (单条)
 */
export const preventMissingPermission = async (permissionId: number) => {
  const rows = await db
    .select({ id: permissionTable.id })
    .from(permissionTable)
    .where(eq(permissionTable.id, permissionId))
    .limit(1);
  if (rows.length === 0) {
    throw new BusinessError(ErrorCodes.PERMISSION_NOT_FOUND);
  }
};

/**
 * 校验权限是否存在 (批量)
 */
export const preventMissingPermissions = async (permissionIds: number[]) => {
  if (permissionIds.length === 0) return;

  // 分片查询以避免变量限制
  const checkChunkSize = 100;
  let allExistingCount = 0;
  for (let i = 0; i < permissionIds.length; i += checkChunkSize) {
    const chunk = permissionIds.slice(i, i + checkChunkSize);
    const rows = await db
      .select({ id: permissionTable.id })
      .from(permissionTable)
      .where(inArray(permissionTable.id, chunk));
    allExistingCount += rows.length;
  }

  if (allExistingCount !== permissionIds.length) {
    throw new BusinessError(ErrorCodes.PERMISSION_NOT_FOUND);
  }
};
