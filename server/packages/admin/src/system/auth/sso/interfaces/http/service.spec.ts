import type { AppBindings } from "@hodor/core/types/app";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SsoError, SsoErrorCode } from "../../domain/sso.js";

const mocks = vi.hoisted(() => ({
  createLoginUrl: vi.fn(),
  createBindUrl: vi.fn(),
  loginCallback: vi.fn(),
  bindCallback: vi.fn(),
  unbind: vi.fn(),
  getBindingSummary: vi.fn(),
  recordLogin: vi.fn(),
}));

vi.mock("../../infrastructure/container.js", () => ({
  SsoConfigurationError: class SsoConfigurationError extends Error {},
  getSsoCenter: () => mocks,
}));

vi.mock("../../../../../common/registry.js", () => ({
  registry: { maintenance: { recordLogin: mocks.recordLogin } },
}));

import ssoHttpService, {
  mapSsoHttpError,
  onSsoAccountUrl,
  onSsoLoginCallback,
  onSsoLoginUrl,
} from "./service.js";

function createContextApp(
  handler: Parameters<Hono<AppBindings>["post"]>[1]
): Hono<AppBindings> {
  const app = new Hono<AppBindings>();
  app.use("*", async (context, next) => {
    context.set("requestId", "req-sso-123");
    await next();
  });
  app.post("/", handler);
  return app;
}

describe("SSO HTTP interface", () => {
  beforeEach(() => vi.clearAllMocks());

  it("只暴露六个固定 POST 接口", () => {
    expect(Object.keys(ssoHttpService)).toEqual([
      "ssoLoginUrl",
      "ssoLoginCallback",
      "ssoAccountUrl",
      "ssoAccountCallback",
      "ssoBindingUnbind",
      "ssoBindingSummary",
    ]);
    expect(
      Object.values(ssoHttpService).map((api) => ({
        path: api.pathInfo.path,
        method: api.pathInfo.method,
        permission: api.permission,
      }))
    ).toEqual([
      { path: "/sso/login/url", method: "post", permission: false },
      { path: "/sso/login/callback", method: "post", permission: false },
      { path: "/sso/account/url", method: "post", permission: false },
      { path: "/sso/account/callback", method: "post", permission: false },
      { path: "/sso/binding/unbind", method: "post", permission: false },
      { path: "/sso/binding/summary", method: "post", permission: false },
    ]);
  });

  it("登录和账号授权都向应用层传播 requestId", async () => {
    mocks.createLoginUrl.mockResolvedValue({ url: "https://sso.example.com" });
    mocks.createBindUrl.mockResolvedValue({ url: "https://sso.example.com" });
    const app = createContextApp(async (context) => {
      await onSsoLoginUrl(
        { redirectUri: "https://gate.example.com/sso/callback" },
        context
      );
      await onSsoAccountUrl(
        { redirectUri: "https://gate.example.com/sso/callback" },
        { userId: 7 },
        context
      );
      return context.json({ ok: true });
    });

    await app.request("/", { method: "POST" });
    expect(mocks.createLoginUrl).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "req-sso-123" })
    );
    expect(mocks.createBindUrl).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "req-sso-123", userId: 7 })
    );
  });

  it("登录成功记录登录审计且不接触 OIDC token", async () => {
    mocks.loginCallback.mockResolvedValue({
      userObj: { id: 7, username: "zq", langCode: "zh-CN", token: "hodor" },
    });
    const app = createContextApp(async (context) => {
      const result = await onSsoLoginCallback(
        { code: "code", state: "s".repeat(32) },
        context
      );
      return context.json(result);
    });

    const response = await app.request("/", {
      method: "POST",
      headers: { "user-agent": "vitest", "x-forwarded-for": "127.0.0.1" },
    });
    expect(response.status).toBe(200);
    expect(mocks.loginCallback).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "req-sso-123" })
    );
    expect(mocks.recordLogin).toHaveBeenCalledWith(
      7,
      "127.0.0.1",
      "vitest",
      "zq"
    );
    expect(await response.json()).toEqual({
      userObj: { id: 7, username: "zq", langCode: "zh-CN", token: "hodor" },
    });
  });

  it("未绑定精确映射为 403 安全文案", () => {
    try {
      mapSsoHttpError(
        new SsoError(SsoErrorCode.ACCOUNT_NOT_BOUND, "账号未绑定，请联系管理员")
      );
      throw new Error("expected mapSsoHttpError to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      if (!(error instanceof HTTPException)) throw error;
      expect(error.status).toBe(403);
      expect(error.message).toBe("账号未绑定，请联系管理员");
    }
  });
});
