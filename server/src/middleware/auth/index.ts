import { tokenUtils } from "@/utils/token";
import { NodeHonoContext } from "@/types/app";
import { utils as userUtils } from "@/api/system/user/service";
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

  const user = await userUtils.getUserObjByName(payload.username);

  if (!user?.isEnabled) {
    throw new BusinessError(BusinessErrorCode.NOT_EXIST_OR_DISABLED);
  }
  const { password, id: userId, ...rest } = user;
  // 将用户信息添加到context中
  c.set("userObj", {
    userId,
    ...rest,
  });
};

// 角色权限检查中间件
export const roleMiddleware = (allowedRoles: number[]) => {
  return async (c: NodeHonoContext) => {
    if (!c.get("userObj")) {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }

    if (
      !allowedRoles.some((role) =>
        c.get("userObj").roleArr.find((r) => r.value === role)
      )
    ) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }
  };
};
