import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import { utils as rolePermissionUtils } from "./service";

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
  const exists = await rolePermissionUtils.verifyRecordExists(id);
  if (!exists) {
    throw new BusinessError(ErrorCodes.RECORD_NOT_FOUND);
  }
};

/**
 * 校验角色是否存在
 */
export const preventMissingRole = async (roleId: number) => {
  const exists = await rolePermissionUtils.verifyRoleExists(roleId);
  if (!exists) {
    throw new BusinessError(ErrorCodes.ROLE_NOT_FOUND);
  }
};
