import { tokenUtils } from "@/utils/token";
import { Context } from "@/types/app";
import userService, { UserObj } from "@/api/system/user/service";
import { SUPER_ADMIN_ROLE_ID } from "@/db/init";
import { utils as rolePermissionUtils } from "@/api/system/role_permission/service";
import { roleTable } from "@/api/system/role/model";
import {
  DataScope,
  SCOPE_PRIORITY,
  type DataScopeValue,
} from "@/types/dataScope";
import db from "@/db/index";
import { inArray } from "drizzle-orm";
import {
  BusinessError,
  BusinessErrorCode,
} from "../errorHandler/businessError";
import { kv } from "../cache";

export const authMiddleware = async (c: Context) => {
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
    dataScope: DataScope.SELF_ONLY,
    customDeptIds: [],

    async ensureLoaded() {
      if (this._isLoaded) return;

      const cacheKey = `system.auth.bundle.${this.userId}`;
      const versionKey = "system.auth.global_version";

      // 1. 尝试从缓存获取权限和数据范围包
      try {
        // 同时获取全局版本号和用户缓存包
        const [globalVersion, cached] = await Promise.all([
          kv.get(versionKey, "text"),
          kv.get<{
            permissions: any[];
            dataScope: DataScopeValue;
            customDeptIds: number[];
            version?: string;
          }>(cacheKey, "json"),
        ]);

        // 校验版本号：只有当版本号一致时才使用缓存
        if (cached && cached.version === (globalVersion || "1")) {
          this.permissions = cached.permissions;
          this.dataScope = cached.dataScope;
          this.customDeptIds = cached.customDeptIds;
          this._isLoaded = true;
          return;
        }
      } catch (error) {
        console.error("Auth Cache Read Error:", error);
      }

      // 2. 缓存未命中、报错或版本过旧，回退到数据库加载逻辑
      const [permissions, globalVersion] = await Promise.all([
        rolePermissionUtils.getPermissionsByRoleIds(this.roleIds),
        kv.get(versionKey, "text").catch(() => "1"),
      ]);

      this.permissions = permissions;

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
          if (SCOPE_PRIORITY[scopeVal] > SCOPE_PRIORITY[effectiveDataScope]) {
            effectiveDataScope = scopeVal;
          }
          if (scopeVal === DataScope.CUSTOM && role.customDeptIds) {
            try {
              const ids: number[] = JSON.parse(role.customDeptIds);
              mergedCustomDeptIds.push(...ids);
            } catch {}
          }
        }
      }
      this.dataScope = effectiveDataScope;
      this.customDeptIds = [...new Set(mergedCustomDeptIds)];

      // 3. 异步回写缓存 (包含当前版本号)
      const putTask = kv
        .put(
          cacheKey,
          {
            permissions: this.permissions,
            dataScope: this.dataScope,
            customDeptIds: this.customDeptIds,
            version: globalVersion || "1",
          },
          { expirationTtl: 3600 }
        )
        .catch((err) => {
          console.error("Auth Cache Write Error:", err);
        });

      try {
        c.executionCtx.waitUntil(putTask);
      } catch (e) {
        // 环境不支持 executionCtx (如本地 Node.js 开发环境)
      }

      this._isLoaded = true;
    },
  };

  // 将用户信息添加到context中
  c.set("userObj", userObj);
};
