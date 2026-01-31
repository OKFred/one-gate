import { tokenUtils } from "@/utils/token";
import { NodeHonoContext } from "@/types/app";
import userService from "@/api/system/user/service";
import { utils as departmentUtils } from "@/api/system/department/service";
import { SUPER_ADMIN_ID } from "@/db/init";
import permissionUtils from "@/middleware/auth/rbac/permission";
import {
  BusinessError,
  BusinessErrorCode,
} from "../errorHandler/businessError";

export const authMiddleware = async (c: NodeHonoContext) => {
  // 从Authorization header中获取token
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  }

  const token = authHeader.substring(7); // 移除 "Bearer " 前缀
  const payload = tokenUtils.verifyToken(token);

  if (!payload) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  }
  const user = await userService.get.service({ id: payload.userId });
  if (!user?.isEnabled) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  const { id: userId, ...rest } = user;
  // 加载用户所属部门及其子部门ID
  const selfAndSubDepartmentIds = user.departmentObj?.value
    ? await departmentUtils.getDepartmentAndSubIds(user.departmentObj.value)
    : undefined;
  // 加载用户权限
  const roleIds = user.roleArr?.map((r) => r.value) || [];
  const permissions = await fetchPermissionsByRoleIds(roleIds);
  // 判断是否为超级管理员
  const isSuperAdmin = userId === SUPER_ADMIN_ID;

  // 将用户信息添加到context中
  c.set("userObj", {
    token,
    userId,
    id: userId,
    isSuperAdmin,
    selfAndSubDepartmentIds,
    permissions,
    ...rest,
  });
};

async function fetchPermissionsByRoleIds(roleIds: number[]) {
  const allPermissions =
    roleIds.length > 0
      ? await permissionUtils.getPermissionsByRoleIds(roleIds)
      : [];

  // 过滤生效的权限（处理 allow/deny）
  const permissions =
    permissionUtils.filterEffectivePermissions(allPermissions);
  return permissions;
}
