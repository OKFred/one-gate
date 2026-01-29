/**
 * 权限校验中间件
 * 提供基于新权限系统的细粒度访问控制
 */

import { Next } from "hono";
import { NodeHonoContext } from "@/types/app";
import {
  BusinessError,
  BusinessErrorCode,
} from "../../errorHandler/businessError";

/**
 * 权限检查中间件 - 检查用户是否拥有指定的权限代码
 * @param requiredPermissions 需要的权限代码数组，用户需要拥有其中至少一个权限
 * @param matchAll 是否需要匹配所有权限（默认 false，只需匹配其中一个）
 */
export const checkPermission = (
  requiredPermissions: string | string[],
  matchAll = false
) => {
  return async (c: NodeHonoContext, next?: Next) => {
    const userObj = c.var.userObj;

    if (!userObj) {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }

    // 超级管理员跳过权限检查
    if (userObj.isSuperAdmin) {
      // console.log("超级管理员，跳过权限检查");
      await next?.();
      return;
    }

    // 获取用户权限
    const userPermissions = userObj.permissions || [];
    if (userPermissions.length === 0) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }
    // 规范化为数组
    const requiredPerms = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    // 检查权限 - 支持正则匹配（以 / 开头结尾）或前缀匹配
    const lookup = (perm: string) => {
      return userPermissions.some((up) => {
        if (up.code.startsWith("/") && up.code.endsWith("/")) {
          try {
            const regex = new RegExp(up.code.slice(1, -1));
            return regex.exec(perm) !== null;
          } catch {
            return perm.startsWith(up.code);
          }
        } else {
          return perm.startsWith(up.code);
        }
      });
    };
    const hasPermission = matchAll
      ? requiredPerms.every(lookup)
      : requiredPerms.some(lookup);
    if (!hasPermission) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }

    await next?.();
  };
};

/**
 * 检查 API 权限的中间件
 * 根据请求路径和方法自动匹配权限
 */
export const checkApiPermission = () => {
  return async (c: NodeHonoContext, next?: Next) => {
    const userObj = c.var.userObj;

    if (!userObj) {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }

    // 超级管理员跳过权限检查
    if (userObj.isSuperAdmin) {
      await next?.();
      return;
    }

    const path = c.req.path;
    const userPermissions = userObj.permissions || [];

    // 查找匹配的 API 权限
    const hasApiPermission = userPermissions.some((perm) => {
      if (perm.type !== "api" || !perm.resource) {
        return false;
      }

      // 简单的路径匹配（可以根据需要增强为正则匹配）
      const resourcePattern = perm.resource.replace(/:\w+/g, "[^/]+");
      const regex = new RegExp(`^${resourcePattern}$`);
      return regex.test(path);
    });

    if (!hasApiPermission) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }

    await next?.();
  };
};

/**
 * 检查资源权限的辅助函数
 * 用于在业务逻辑中检查用户对特定资源的访问权限
 */
export function hasResourcePermission(
  userObj: any,
  permissionCode: string,
  resourceOwnerId?: number
): boolean {
  // 超级管理员始终有权限
  if (userObj.isSuperAdmin) {
    return true;
  }

  const userPermissions = userObj.permissions || [];
  const permission = userPermissions.find(
    (p: any) => p.code === permissionCode
  );

  if (!permission) {
    return false;
  }

  // 根据 scope 检查权限
  switch (permission.scope) {
    case "all":
      return true;
    case "own":
      // 只能访问自己的资源
      return (
        resourceOwnerId !== undefined && resourceOwnerId === userObj.userId
      );
    case "dept":
      // 部门级权限（需要在调用时传入资源所属部门ID并比较）
      // 这里简化处理，实际可以扩展
      return true;
    case "custom":
      // 自定义条件判断（需要解析 resourceFilter）
      // 这里简化处理，实际需要实现条件评估逻辑
      return true;
    default:
      return false;
  }
}

/**
 * 检查用户是否有任一指定角色
 */
export const checkRole = (allowedRoleIds: number[]) => {
  return async (c: NodeHonoContext, next?: Next) => {
    const userObj = c.var.userObj;

    if (!userObj) {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }

    const userRoles = userObj.roleArr || [];
    const hasRole = userRoles.some((roleObj) =>
      allowedRoleIds.includes(roleObj.value)
    );

    if (!hasRole) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }

    await next?.();
  };
};

/**
 * 检查菜单权限的辅助函数
 * 用于前端菜单渲染时过滤
 */
export function filterMenusByPermissions(
  menus: any[],
  userPermissions: any[]
): any[] {
  return menus.filter((menu) => {
    // 查找对应的菜单权限
    const hasMenuPermission = userPermissions.some(
      (perm) =>
        perm.type === "menu" &&
        perm.resource === menu.path &&
        perm.effect === "allow"
    );
    return hasMenuPermission;
  });
}

/**
 * 检查按钮权限的辅助函数
 * 用于前端按钮显示控制
 */
export function hasButtonPermission(
  userPermissions: any[],
  buttonCode: string
): boolean {
  return userPermissions.some(
    (perm) =>
      perm.type === "button" &&
      perm.code === buttonCode &&
      perm.effect === "allow"
  );
}
