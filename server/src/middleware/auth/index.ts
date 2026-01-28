import { Next } from "hono";
import { tokenUtils } from "@/utils/token";
import { NodeHonoContext } from "@/types/app";
import userService from "@/api/system/user/service";
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
  // 将用户信息添加到context中
  c.set("userObj", {
    token,
    userId,
    id: userId,
    ...rest,
  });
};

export const roleMiddleware = (allowedRoles: number[]) => {
  return async (c: NodeHonoContext, next: Next) => {
    const userObj = c.var.userObj;

    if (!userObj) {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }
    const userRoles = userObj.roleArr || [];
    const hasRole = userRoles.some((roleObj) =>
      allowedRoles.includes(roleObj.value)
    );

    if (!hasRole) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }

    await next();
  };
};
