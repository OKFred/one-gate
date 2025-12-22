import { Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { NodeHonoContext } from "@/types/app";
import { ContentfulStatusCode } from "hono/utils/http-status";
import httpStatusCode from "http-status-codes";
import type { LanguageKey } from "@/types/locales";

export const roleMiddleware = (allowedRoles: number[]) => {
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
    const userRoles = user.roleIdArr || [];
    const hasRole = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      throw new HTTPException(
        httpStatusCode.FORBIDDEN as ContentfulStatusCode,
        {
          message:
            "i18n.api.system.insufficientPermission" satisfies LanguageKey,
        }
      );
    }

    await next();
  };
};
