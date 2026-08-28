import { describe, expect, it } from "vitest";
import { HTTPException } from "hono/http-exception";
import { OAuthError, OAuthErrorCode } from "../../domain/oauth.js";

import oauthHttpService, { mapOAuthError } from "./service.js";

describe("OAuth HTTP error mapping", () => {
  it("未绑定登录返回精确的 403 顶层消息", () => {
    try {
      mapOAuthError(
        new OAuthError(
          OAuthErrorCode.ACCOUNT_NOT_BOUND,
          "账号未绑定，请联系管理员"
        )
      );
      throw new Error("expected mapOAuthError to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      if (!(error instanceof HTTPException)) throw error;
      expect(error.status).toBe(403);
      expect(error.message).toBe("账号未绑定，请联系管理员");
      expect(error.cause).toEqual({
        error: { code: OAuthErrorCode.ACCOUNT_NOT_BOUND },
      });
    }
  });

  it("远端撤权失败返回明确的 502 且说明本地绑定保留", () => {
    try {
      mapOAuthError(
        new OAuthError(OAuthErrorCode.REVOKE_FAILED, "provider rejected revoke")
      );
      throw new Error("expected mapOAuthError to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      if (!(error instanceof HTTPException)) throw error;
      expect(error.status).toBe(502);
      expect(error.message).toBe("撤销 GitHub OAuth 授权失败，本地绑定已保留");
      expect(error.cause).toEqual({
        error: { code: OAuthErrorCode.REVOKE_FAILED },
      });
    }
  });

  it("Provider 配置缺失返回不暴露配置细节的 503", () => {
    try {
      mapOAuthError(
        new OAuthError(
          OAuthErrorCode.PROVIDER_NOT_CONFIGURED,
          "Missing provider secret"
        )
      );
      throw new Error("expected mapOAuthError to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      if (!(error instanceof HTTPException)) throw error;
      expect(error.status).toBe(503);
      expect(error.message).toBe("OAuth 登录暂不可用，请联系管理员");
      expect(error.message).not.toContain("secret");
      expect(error.cause).toEqual({
        error: { code: OAuthErrorCode.PROVIDER_NOT_CONFIGURED },
      });
    }
  });

  it("state 失败保留精确安全错误码", () => {
    try {
      mapOAuthError(
        new OAuthError(
          OAuthErrorCode.INVALID_STATE,
          "OAuth state 无效、已过期或已被使用"
        )
      );
      throw new Error("expected mapOAuthError to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HTTPException);
      if (!(error instanceof HTTPException)) throw error;
      expect(error.status).toBe(400);
      expect(error.cause).toEqual({
        error: { code: OAuthErrorCode.INVALID_STATE },
      });
    }
  });

  it("只暴露六个固定 POST OAuth 接口", () => {
    expect(Object.keys(oauthHttpService)).toEqual([
      "oauthLoginUrl",
      "oauthLoginCallback",
      "oauthAccountUrl",
      "oauthAccountCallback",
      "oauthBindingUnbind",
      "oauthBindingProfile",
    ]);
    expect(
      Object.values(oauthHttpService).map((api) => ({
        path: api.pathInfo.path,
        method: api.pathInfo.method,
        permission: api.permission,
      }))
    ).toEqual([
      { path: "/oauth/login/url", method: "post", permission: false },
      { path: "/oauth/login/callback", method: "post", permission: false },
      { path: "/oauth/account/url", method: "post", permission: false },
      { path: "/oauth/account/callback", method: "post", permission: false },
      { path: "/oauth/binding/unbind", method: "post", permission: false },
      { path: "/oauth/binding/profile", method: "post", permission: false },
    ]);
  });
});
