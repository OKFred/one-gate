import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import { authMiddleware } from "@hodor/core/middleware/auth/index.js";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError/index.js";
import type { App, AppBindings, Context } from "@hodor/core/types/app.js";
import { getEnv } from "@hodor/core/utils/env.js";
import { tokenUtils } from "@hodor/core/utils/token.js";

import { TotpGateApplicationError } from "../../application/error.js";
import type {
  TotpGateCenter,
  TotpGatePrimarySession,
} from "../../application/totp-gate-center.js";
import { TOTP_GATE_ERROR_CODES } from "../../domain/totp-gate.js";

const PRODUCTION_COOKIE_NAME = "__Host-hodor-totp-gate";
const DEVELOPMENT_COOKIE_NAME = "hodor-totp-gate";

const gateStatusSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    verified: z.boolean(),
    expiresAtUtc: z.string().nullable(),
  }),
  message: z.string(),
});

const statusRoute = createRoute({
  method: "post",
  path: "/status",
  tags: ["admin.system.auth.gate"],
  summary: "查询动态验证码门禁状态",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: z.object({}) } },
    },
  },
  responses: {
    200: {
      description: "当前 Hodor 登录态的门禁状态",
      content: { "application/json": { schema: gateStatusSchema } },
    },
  },
});

const verifyRoute = createRoute({
  method: "post",
  path: "/verify",
  tags: ["admin.system.auth.gate"],
  summary: "验证动态验证码",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ code: z.string().regex(/^\d{6}$/u) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "验证成功并签发门禁 Cookie",
      content: { "application/json": { schema: gateStatusSchema } },
    },
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["admin.system.auth.gate"],
  summary: "清除动态验证码门禁",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: z.object({}) } },
    },
  },
  responses: {
    200: {
      description: "门禁 Cookie 已清除",
      content: { "application/json": { schema: gateStatusSchema } },
    },
  },
});

export type TotpGateCenterResolver = (context: Context) => TotpGateCenter;

export function getTotpGateCookieName(): string {
  return getEnv("NODE_ENV") === "production"
    ? PRODUCTION_COOKIE_NAME
    : DEVELOPMENT_COOKIE_NAME;
}

export function clearTotpGateCookie(context: Context): void {
  deleteCookie(context, getTotpGateCookieName(), {
    path: "/",
    secure: getEnv("NODE_ENV") === "production",
    httpOnly: true,
    sameSite: "Lax",
  });
}

export async function requireTotpGatePrimarySession(
  context: Context
): Promise<TotpGatePrimarySession> {
  await authMiddleware(context);
  const user = context.get("userObj");
  if (!user || user.token.startsWith("hdr_")) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  }
  const payload = tokenUtils.verifyToken(user.token);
  if (!payload || payload.userId !== user.userId) {
    throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
  }
  return {
    userId: payload.userId,
    token: user.token,
    expiresAtMs: payload.exp,
  };
}

function mapApplicationError(error: unknown): never {
  if (!(error instanceof TotpGateApplicationError)) throw error;
  const code = error.code;
  if (code === TOTP_GATE_ERROR_CODES.REQUIRED) {
    throw new BusinessError(BusinessErrorCode.TOTP_GATE_REQUIRED);
  }
  if (code === TOTP_GATE_ERROR_CODES.CODE_INVALID) {
    throw new BusinessError(BusinessErrorCode.TOTP_CODE_INVALID);
  }
  if (code === TOTP_GATE_ERROR_CODES.RATE_LIMITED) {
    throw new BusinessError(BusinessErrorCode.TOTP_GATE_RATE_LIMITED);
  }
  throw new BusinessError(BusinessErrorCode.TOTP_GATE_UNAVAILABLE);
}

function requestId(context: Context): string {
  return context.get("requestId") || crypto.randomUUID();
}

function clientIdentity(context: Context): string {
  return [
    context.req.header("cf-connecting-ip") ??
      context.req.header("x-forwarded-for") ??
      context.req.header("x-real-ip") ??
      "unknown",
    context.req.header("user-agent") ?? "unknown",
  ].join("|");
}

export function createTotpGateHttpApp(
  resolveCenter: TotpGateCenterResolver
): App {
  const app = new OpenAPIHono<AppBindings>();
  app.openAPIRegistry.registerPath(statusRoute);
  app.openAPIRegistry.registerPath(verifyRoute);
  app.openAPIRegistry.registerPath(logoutRoute);

  app.post("/status", async (context) => {
    const primary = await requireTotpGatePrimarySession(context);
    try {
      const result = await resolveCenter(context).getStatus({
        primary,
        cookieValue: getCookie(context, getTotpGateCookieName()),
        requestId: requestId(context),
      });
      return context.json(
        { ok: true, data: result, message: "OK" } as const,
        200
      );
    } catch (error) {
      return mapApplicationError(error);
    }
  });

  app.post("/verify", async (context) => {
    const primary = await requireTotpGatePrimarySession(context);
    const body: unknown = await context.req.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("code" in body) ||
      typeof body.code !== "string"
    ) {
      throw new BusinessError(BusinessErrorCode.VALIDATION_FAILED);
    }
    try {
      const result = await resolveCenter(context).verify({
        primary,
        clientIdentity: clientIdentity(context),
        code: body.code,
        requestId: requestId(context),
      });
      setCookie(context, getTotpGateCookieName(), result.cookieValue, {
        path: "/",
        secure: getEnv("NODE_ENV") === "production",
        httpOnly: true,
        sameSite: "Lax",
        maxAge: result.maxAgeSeconds,
      });
      return context.json(
        {
          ok: true,
          data: {
            verified: result.verified,
            expiresAtUtc: result.expiresAtUtc,
          },
          message: "OK",
        } as const,
        200
      );
    } catch (error) {
      return mapApplicationError(error);
    }
  });

  app.post("/logout", (context) => {
    clearTotpGateCookie(context);
    return context.json(
      {
        ok: true,
        data: { verified: false, expiresAtUtc: null },
        message: "OK",
      } as const,
      200
    );
  });

  return app;
}
