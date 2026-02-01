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
  requiredPermissions: string[],
  matchAll = false
) => {
  return async (c: NodeHonoContext) => {
    const userObj = c.var.userObj;

    if (!userObj) {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }

    // 超级管理员跳过权限检查
    if (userObj.isSuperAdmin) {
      // console.log("超级管理员，跳过权限检查");
      return;
    }

    // 获取用户权限
    const userPermissions = userObj.permissions || [];
    if (userPermissions.length === 0) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }

    // 检查权限 - 支持正则匹配（以 / 开头结尾）或部分匹配
    const lookup = (perm: string) => {
      return userPermissions.some((up) => {
        if (up.code.startsWith("/") && up.code.endsWith("/")) {
          try {
            const regex = new RegExp(up.code.slice(1, -1));
            return regex.exec(perm) !== null;
          } catch {
            return perm.includes(up.code);
          }
        } else {
          return perm.includes(up.code);
        }
      });
    };
    const hasPermission = matchAll
      ? requiredPermissions.every(lookup)
      : requiredPermissions.some(lookup);
    if (!hasPermission) {
      console.log(
        "权限不足，拒绝访问",
        JSON.stringify({
          requiredPermissions,
          userPermissions,
        })
      );
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }
  };
};
