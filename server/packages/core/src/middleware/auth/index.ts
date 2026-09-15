import { tokenUtils } from "../../utils/token";
import type { Context, UserObj } from "../../types/app";
import { SUPER_ADMIN_ROLE_ID } from "../../db/init";
import { registry } from "../../../../admin/src/common/registry";
import {
  DataScope,
  SCOPE_PRIORITY,
  type DataScopeValue,
} from "../../types/dataScope";
import {
  BusinessError,
  BusinessErrorCode,
} from "../errorHandler/businessError";
import { kv } from "../cache";
import crypto from "crypto";
import { apiTokenRepository } from "../../../../admin/src/system/api-token/repository";

interface AuthBundle {
  schemaVersion: 2;
  roleFingerprint: string;
  version: string;
  permissions: UserObj["permissions"];
  dataScope: DataScopeValue;
  customDeptIds: number[];
}

function isDataScope(value: unknown): value is DataScopeValue {
  return typeof value === "string" && Object.hasOwn(SCOPE_PRIORITY, value);
}

function isDepartmentIds(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every(
      (id: unknown) =>
        typeof id === "number" && Number.isSafeInteger(id) && id > 0
    )
  );
}

export const authMiddleware = async (c: Context) => {
  if (c.get("userObj")) return;

  // 从Authorization header中获取token
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  }

  const token = authHeader.substring(7); // 移除 "Bearer " 前缀

  // ====== API Token 鉴权分支（hdr_ 前缀） ======
  if (token.startsWith("hdr_")) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const apiToken = await apiTokenRepository.findByTokenHash(tokenHash);

    if (!apiToken || apiToken.status !== "active") {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }

    // 过期校验
    const now = Date.now();
    if (apiToken.startTimeUtc && now < apiToken.startTimeUtc) {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }
    if (apiToken.expireTimeUtc && now > apiToken.expireTimeUtc) {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }

    // IP 白名单校验
    if (apiToken.ipWhitelist) {
      const allowedIps: string[] = JSON.parse(apiToken.ipWhitelist);
      if (allowedIps.length > 0) {
        const clientIp =
          c.req.header("x-forwarded-for") ||
          c.req.header("x-real-ip") ||
          "unknown";
        if (!allowedIps.includes(clientIp)) {
          throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
        }
      }
    }

    // 将令牌权限 code 列表转换为 PermissionInfo 格式
    const permissionCodes: string[] = JSON.parse(apiToken.permissions);
    const tokenPermissions = permissionCodes.map((code) => ({
      id: 0,
      code,
      name: code,
      category: "action" as const,
      resource: null,
      business: code.split(":")[0] || null,
      remark: null,
      isEnabled: true,
      creatorId: apiToken.creatorId,
      updaterId: null,
      createTimeUtc: apiToken.createTimeUtc,
      updateTimeUtc: null,
    }));

    // 构建受限 userObj（不关联用户身份，权限来自令牌自身）
    const apiTokenUserObj: UserObj = {
      token,
      userId: apiToken.creatorId,
      id: apiToken.creatorId,
      isSuperAdmin: false,
      roleIds: [],
      username: `api-token:${apiToken.name}`,
      langCode: "zh-CN",
      isEnabled: true,
      _isLoaded: true,
      permissions: tokenPermissions,
      dataScope: DataScope.SELF_ONLY,
      customDeptIds: [],
      async ensureLoaded() {
        /* API Token 权限在构建时已经加载完毕，无需懒加载 */
      },
    };

    c.set("userObj", apiTokenUserObj);

    // 异步更新最后使用时间
    const updateTask = apiTokenRepository
      .updateLastUsedTime(apiToken.id)
      .catch(() => {});
    try {
      c.executionCtx.waitUntil(updateTask);
    } catch {
      // 本地 Node.js 开发环境不支持 executionCtx
    }

    return;
  }

  // ====== 用户 JWT 鉴权（原有逻辑） ======
  const payload = tokenUtils.verifyToken(token);

  if (!payload) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  }
  const user = await registry.system.getUser(payload.userId);
  if (!user?.isEnabled) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  const { id: userId, ...rest } = user;
  const boundRoleIds = user.roleArr?.map((r) => r.value) || [];
  const authorizationRoles = (
    await registry.system.getAuthorizationRoles(boundRoleIds)
  )
    .map((role) => ({
      id: role.id,
      dataScope: role.dataScope,
      customDeptIds: role.customDeptIds,
      updateTimeUtc: role.updateTimeUtc,
    }))
    .sort((left, right) => left.id - right.id);
  const roleIds = authorizationRoles.map((role) => role.id);
  const roleFingerprint = JSON.stringify(authorizationRoles);
  const isSuperAdmin = roleIds.includes(SUPER_ADMIN_ROLE_ID);

  // 构建初始 userObj（此时 permissions 和 dataScope 尚未计算）
  const userObj: UserObj = {
    token,
    userId,
    id: userId,
    isSuperAdmin,
    roleIds: [...roleIds],
    ...rest,
    remark: rest.remark ?? undefined,
    updaterId: rest.updaterId ?? undefined,
    updateTimeUtc: rest.updateTimeUtc ?? undefined,
    _isLoaded: false,
    permissions: [],
    dataScope: DataScope.SELF_ONLY,
    customDeptIds: [],

    async ensureLoaded() {
      if (this._isLoaded) return;

      const cacheKey = `system.auth.bundle:${userId}`;
      const versionKey = "system.auth:global_version";
      let version: string | undefined;

      // Capture the version before permission queries; late writes keep their
      // original role snapshot and cannot masquerade as a newer authority.
      try {
        const [globalVersion, cached] = await Promise.all([
          kv.get(versionKey, "text"),
          kv.get<Partial<AuthBundle>>(cacheKey, "json"),
        ]);
        version = globalVersion || "1";

        if (
          cached?.schemaVersion === 2 &&
          cached.roleFingerprint === roleFingerprint &&
          cached.version === version &&
          Array.isArray(cached.permissions) &&
          isDataScope(cached.dataScope) &&
          isDepartmentIds(cached.customDeptIds)
        ) {
          this.permissions = cached.permissions;
          this.dataScope = cached.dataScope;
          this.customDeptIds = cached.customDeptIds;
          this._isLoaded = true;
          return;
        }
      } catch {
        console.error(
          JSON.stringify({ event: "auth.cache.read_failed", level: "error" })
        );
      }

      const permissions =
        await registry.system.getPermissionsByRoleIds(roleIds);

      let effectiveDataScope: DataScopeValue = DataScope.SELF_ONLY;
      const mergedCustomDeptIds: number[] = [];

      for (const role of authorizationRoles) {
        const scopeVal = isDataScope(role.dataScope)
          ? role.dataScope
          : DataScope.SELF_ONLY;
        if (SCOPE_PRIORITY[scopeVal] > SCOPE_PRIORITY[effectiveDataScope]) {
          effectiveDataScope = scopeVal;
        }
        if (scopeVal === DataScope.CUSTOM && role.customDeptIds) {
          try {
            const ids: unknown = JSON.parse(role.customDeptIds);
            if (isDepartmentIds(ids)) mergedCustomDeptIds.push(...ids);
          } catch {
            // Ignore malformed legacy role scope values and keep the safe default.
          }
        }
      }
      const customDeptIds = [...new Set(mergedCustomDeptIds)];
      this.permissions = permissions;
      this.dataScope = effectiveDataScope;
      this.customDeptIds = customDeptIds;
      this._isLoaded = true;

      // A failed KV read does not establish a version suitable for cache writes.
      if (version === undefined) return;
      const bundle: AuthBundle = {
        schemaVersion: 2,
        roleFingerprint,
        permissions,
        dataScope: effectiveDataScope,
        customDeptIds,
        version,
      };
      const putTask = kv
        .put(cacheKey, bundle, { expirationTtl: 3600 })
        .catch(() => {
          console.error(
            JSON.stringify({ event: "auth.cache.write_failed", level: "error" })
          );
        });

      try {
        c.executionCtx.waitUntil(putTask);
      } catch {
        await putTask;
      }
    },
  };

  // 将用户信息添加到context中
  c.set("userObj", userObj);
};
