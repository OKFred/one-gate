import { BusinessError } from "@/middleware/errorHandler/businessError";
import { utils as permissionUtils } from "./service";

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
  const count = await permissionUtils.countPermissionsByIds([id]);
  if (count === 0) {
    throw new BusinessError(ErrorCodes.NOT_FOUND);
  }
};

/**
 * 批量校验权限记录是否存在
 */
export const preventMissingPermissions = async (ids: number[]) => {
  if (ids.length === 0) return;
  const uniqueIds = Array.from(new Set(ids));
  const count = await permissionUtils.countPermissionsByIds(uniqueIds);
  if (count !== uniqueIds.length) {
    throw new BusinessError(ErrorCodes.NOT_FOUND);
  }
};
