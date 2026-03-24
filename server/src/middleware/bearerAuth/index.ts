import { tokenUtils } from "@/utils/token";
import { NodeHonoContext } from "@/types/app";
import userService from "@/api/system/user/service";
import { SUPER_ADMIN_ROLE_ID } from "@/db/init";
import { utils as rolePermissionUtils } from "@/api/system/role_permission/service";
import { roleTable } from "@/api/system/role/model";
import { DataScope, type DataScopeValue } from "@/types/dataScope";
import db from "@/db/index";
import { inArray } from "drizzle-orm";
import {
  BusinessError,
  BusinessErrorCode,
} from "../errorHandler/businessError";

/** DataScope 优先级（值越大越优先） */
const SCOPE_PRIORITY: Record<DataScopeValue, number> = {
  [DataScope.ALL]: 4,
  [DataScope.DEPT_AND_BELOW]: 3,
  [DataScope.CUSTOM]: 2,
  [DataScope.SELF_ONLY]: 1,
};

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
  // 加载用户权限
  const roleIds = user.roleArr?.map((r) => r.value) || [];
  const permissions =
    await rolePermissionUtils.getPermissionsByRoleIds(roleIds);
  // 判断是否为超级管理员（保留，用于接口访问控制）
  const isSuperAdmin = roleIds.includes(SUPER_ADMIN_ROLE_ID);

  // 计算有效 dataScope：查询所有角色的 dataScope，取优先级最高的
  let effectiveDataScope: DataScopeValue = DataScope.SELF_ONLY;
  const mergedCustomDeptIds: number[] = [];

  if (roleIds.length > 0) {
    const roles = await db
      .select({
        dataScope: roleTable.dataScope,
        customDeptIds: roleTable.customDeptIds,
      })
      .from(roleTable)
      .where(inArray(roleTable.id, roleIds));

    for (const role of roles) {
      const scopeVal = (role.dataScope ??
        DataScope.SELF_ONLY) as DataScopeValue;
      // 取优先级最高的 dataScope
      if (SCOPE_PRIORITY[scopeVal] > SCOPE_PRIORITY[effectiveDataScope]) {
        effectiveDataScope = scopeVal;
      }
      // 合并自定义部门 ID
      if (scopeVal === DataScope.CUSTOM && role.customDeptIds) {
        try {
          const ids: number[] = JSON.parse(role.customDeptIds);
          mergedCustomDeptIds.push(...ids);
        } catch {
          // 忽略解析失败
        }
      }
    }
  }

  // 将用户信息添加到context中
  c.set("userObj", {
    token,
    userId,
    id: userId,
    isSuperAdmin,
    permissions,
    dataScope: effectiveDataScope,
    customDeptIds: [...new Set(mergedCustomDeptIds)], // 去重
    ...rest,
  });
};
