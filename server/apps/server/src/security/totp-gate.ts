import { getCookie } from "hono/cookie";

import {
  TotpGateApplicationError,
  TOTP_GATE_ERROR_CODES,
  getTotpGateCookieName,
  requireTotpGatePrimarySession,
  type TotpGateCenterResolver,
} from "@hodor/admin/system/auth/totp-gate/index.js";
import { authMiddleware } from "@hodor/core/middleware/auth/index.js";
import { classifyAuthenticationRoute } from "@hodor/core/middleware/authenticationRoutePolicy/index.js";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index.js";
import type { App } from "@hodor/core/types/app.js";

export interface TotpGateMiddlewareOptions {
  readonly baseApiPath: string;
  readonly resolveTotpGateCenter: TotpGateCenterResolver;
}

function stripBaseApiPath(
  path: string,
  baseApiPath: string
): string | undefined {
  if (path === baseApiPath) return "/";
  if (!path.startsWith(`${baseApiPath}/`)) return undefined;
  return path.slice(baseApiPath.length);
}

export function registerTotpGateMiddleware(
  app: App,
  options: TotpGateMiddlewareOptions
): void {
  app.use("*", async (context, next) => {
    if (context.req.method === "OPTIONS") return next();
    const apiPath = stripBaseApiPath(context.req.path, options.baseApiPath);
    if (!apiPath) return next();

    const classification = classifyAuthenticationRoute(apiPath);
    if (
      classification === "primaryAuthAnonymous" ||
      classification === "retiredAuthenticationRoute" ||
      classification === "totpGateAuthenticatedControl" ||
      classification === "totpGateAnonymousControl" ||
      classification === "machineCredentialBypass" ||
      classification === "websocketCredentialBypass"
    ) {
      return next();
    }

    await authMiddleware(context);
    const user = context.get("userObj");
    if (user?.token.startsWith("hdr_")) return next();

    const primary = await requireTotpGatePrimarySession(context);
    try {
      const status = await options.resolveTotpGateCenter(context).getStatus({
        primary,
        cookieValue: getCookie(context, getTotpGateCookieName()),
        requestId: context.get("requestId") || crypto.randomUUID(),
      });
      if (!status.verified) {
        throw new BusinessError(BusinessErrorCode.TOTP_GATE_REQUIRED);
      }
    } catch (error) {
      if (
        error instanceof TotpGateApplicationError &&
        error.code === TOTP_GATE_ERROR_CODES.UNAVAILABLE
      ) {
        throw new BusinessError(BusinessErrorCode.TOTP_GATE_UNAVAILABLE);
      }
      throw error;
    }
    return next();
  });
}
