import { describe, expect, it } from "vitest";
import {
  isFeishuAccountActive,
  OAuthError,
  parseAccountIntent,
  parseOAuthProvider,
  validateRedirectUri,
} from "./oauth.js";

describe("OAuth domain rules", () => {
  it("只接受受支持的 Provider 和账号意图", () => {
    expect(parseOAuthProvider("github")).toBe("github");
    expect(parseOAuthProvider("feishu")).toBe("feishu");
    expect(parseAccountIntent()).toBe("bind");
    expect(parseAccountIntent("unbind")).toBe("unbind");
    expect(() => parseOAuthProvider("wechat")).toThrow(OAuthError);
    expect(() => parseAccountIntent("login")).toThrow(OAuthError);
  });

  it("回调必须命中允许 origin 和固定路径", () => {
    expect(
      validateRedirectUri("http://localhost:5173/oauth/callback", [
        "http://localhost:5173",
      ])
    ).toBe("http://localhost:5173/oauth/callback");
    expect(() =>
      validateRedirectUri("https://attacker.example/oauth/callback", [
        "http://localhost:5173",
      ])
    ).toThrow(OAuthError);
    expect(() =>
      validateRedirectUri("http://localhost:5173/github-callback", [
        "http://localhost:5173",
      ])
    ).toThrow(OAuthError);
  });

  it("仅接受已激活且未冻结、未离职、已加入的飞书成员", () => {
    expect(
      isFeishuAccountActive({
        status: {
          is_activated: true,
          is_frozen: false,
          is_resigned: false,
          is_unjoin: false,
        },
      })
    ).toBe(true);
    for (const rejectedStatus of [
      { is_activated: false },
      { is_activated: true, is_frozen: true },
      { is_activated: true, is_resigned: true },
      { is_activated: true, is_exited: true },
      { is_activated: true, is_unjoin: true },
    ]) {
      expect(isFeishuAccountActive({ status: rejectedStatus })).toBe(false);
    }
  });
});
