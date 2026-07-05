import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import { SUPER_ADMIN_ROLE_ID } from "@hodor/core/db/init";
import { utils as roleUtils } from "./service";
import { DataScope } from "@hodor/core/types/dataScope";

/**
 * 角色模块错误码映射
 * 必须同步在 src/db/initTranslation.ts 中补全翻译
 */
export const ErrorCodes = {
  SUPER_ADMIN_DELETE: "errorHandler.system.role.superAdminDeleteProhibited",
  SUPER_ADMIN_UPDATE: "errorHandler.system.role.superAdminUpdateProhibited",
  ROLE_NOT_EXIST: "errorHandler.roleNotExist",
} as const;

/**
 * 禁止删除超级管理员角色
 */
export const preventSuperAdminDelete = (id: number) => {
  if (id === SUPER_ADMIN_ROLE_ID) {
    throw new BusinessError(ErrorCodes.SUPER_ADMIN_DELETE);
  }
};

/**
 * 禁止禁用超级管理员角色或修改其数据范围
 */
export const preventSuperAdminUpdate = (
  id: number,
  params: { isEnabled?: boolean; dataScope?: string }
) => {
  if (id === SUPER_ADMIN_ROLE_ID) {
    if (params.isEnabled === false) {
      throw new BusinessError(ErrorCodes.SUPER_ADMIN_UPDATE);
    }
    if (params.dataScope && params.dataScope !== DataScope.ALL) {
      throw new BusinessError(ErrorCodes.SUPER_ADMIN_UPDATE);
    }
  }
};

/**
 * 校验角色是否存在
 */
export const preventMissingRoles = async (roleIds: number[]) => {
  const rows = await roleUtils.getRolesByIds(roleIds);
  if (rows.length !== roleIds.length) {
    throw new BusinessError(ErrorCodes.ROLE_NOT_EXIST);
  }
};
