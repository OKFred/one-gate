import { Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { NodeHonoContext } from "@/types/app";
import { ContentfulStatusCode } from "hono/utils/http-status";
import httpStatusCode from "http-status-codes";
import type { LanguageKey } from "@/types/locales";

export const roleMiddleware = (allowedRoles: string[]) => {
  return async (c: NodeHonoContext, next: Next) => {
    const user = c.var.userObj;

    if (!user) {
      throw new HTTPException(
        httpStatusCode.UNAUTHORIZED as ContentfulStatusCode,
        {
          message: "i18n.api.system.noToken" satisfies LanguageKey,
        }
      );
    }

    // roleIds is a string, possibly comma separated
    const userRoles = user.roleIds ? user.roleIds.split(",") : [];
    
    // Check if user has at least one of the allowed roles
    const hasRole = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      throw new HTTPException(
        httpStatusCode.FORBIDDEN as ContentfulStatusCode,
        {
          message: "i18n.api.system.insufficientPermission" satisfies LanguageKey,
        }
      );
    }

    await next();
  };
};
