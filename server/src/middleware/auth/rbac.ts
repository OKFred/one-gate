import { Next } from "hono";
import { NodeHonoContext } from "@/types/app";
import {
  BusinessError,
  BusinessErrorCode,
} from "../errorHandler/businessError";

export const roleMiddleware = (allowedRoles: number[]) => {
  return async (c: NodeHonoContext, next: Next) => {
    const user = c.var.userObj;

    if (!user) {
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    }
    const userRoles = user.roleArr || [];
    const hasRole = userRoles.some((roleObj) =>
      allowedRoles.includes(roleObj.value)
    );

    if (!hasRole) {
      throw new BusinessError(BusinessErrorCode.PERMISSION_DENIED);
    }

    await next();
  };
};
