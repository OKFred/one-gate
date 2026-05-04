import { tokenUtils } from "@/utils/token";
import { NodeHonoContext } from "@/types/app";
import userService, { UserObj } from "@/api/system/user/service";
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
import { kv } from "../cache";

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
  const roleIds = user.roleArr?.map((r) => r.value) || [];
  const isSuperAdmin = roleIds.includes(SUPER_ADMIN_ROLE_ID);

  // 构建初始 userObj（此时 permissions 和 dataScope 尚未计算）
  const userObj: UserObj = {
    token,
    userId,
    id: userId,
    isSuperAdmin,
    roleIds,
    ...rest,
    _isLoaded: false,
    permissions: [],
    permissionCodes: new Set<string>(),
    dataScope: DataScope.SELF_ONLY,
    customDeptIds: [],

    async ensureLoaded() {
      if (this._isLoaded) return;

      const cacheKey = `auth:bundle:${this.userId}`;

      // 1. 尝试从缓存获取权限和数据范围包
      try {
        const cached = await kv.get<{
          permissions: any[];
          dataScope: DataScopeValue;
          customDeptIds: number[];
        }>(cacheKey, "json");

        if (cached) {
          this.permissions = cached.permissions;
          this.permissionCodes = new Set(cached.permissions.map((p) => p.code));
          this.dataScope = cached.dataScope;
          this.customDeptIds = cached.customDeptIds;
          this._isLoaded = true;
          return;
        }
      } catch (error) {
        // 缓存读取报错（如 KV 限额已满），记录日志并回退到数据库
        console.error("Auth Cache Read Error:", error);
      }

      // 2. 缓存未命中或报错，回退到数据库加载逻辑
      // 2.1 加载用户权限
      const permissions = await rolePermissionUtils.getPermissionsByRoleIds(
        this.roleIds
      );
      this.permissions = permissions;
      this.permissionCodes = new Set(permissions.map((p) => p.code));

      // 2.2 计算有效 dataScope：查询所有角色的 dataScope，取优先级最高的
      let effectiveDataScope: DataScopeValue = DataScope.SELF_ONLY;
      const mergedCustomDeptIds: number[] = [];

      if (this.roleIds.length > 0) {
        const roles = await db
          .select({
            dataScope: roleTable.dataScope,
            customDeptIds: roleTable.customDeptIds,
          })
          .from(roleTable)
          .where(inArray(roleTable.id, this.roleIds));

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
      this.dataScope = effectiveDataScope;
      this.customDeptIds = [...new Set(mergedCustomDeptIds)];

      // 3. 异步回写缓存 (有效期 1 小时)
      const putTask = kv
        .put(
          cacheKey,
          {
            permissions: this.permissions,
            dataScope: this.dataScope,
            customDeptIds: this.customDeptIds,
          },
          { expirationTtl: 3600 }
        )
        .catch((err) => {
          console.error("Auth Cache Write Error:", err);
        });

      // 如果有 executionCtx (Cloudflare Workers)，则使用 waitUntil 确保任务执行
      if (c.executionCtx) {
        c.executionCtx.waitUntil(putTask);
      }

      this._isLoaded = true;
    },
  };

  // 将用户信息添加到context中
  c.set("userObj", userObj);
};
