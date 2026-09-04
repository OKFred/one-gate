import { describe, expect, it } from "vitest";
import {
  assertPrincipalMatches,
  createS256PkceInput,
  normalizeSsoConnectionValues,
  normalizeSsoIssuer,
  parseSsoIntent,
  SsoErrorCode,
  toSsoClientConfiguration,
  validateSsoRedirectUri,
  type SsoClientConfiguration,
  type VerifiedSsoPrincipal,
} from "./sso.js";

const productionConfiguration: SsoClientConfiguration = {
  issuer: "https://sso.example.com/identity/",
  clientId: "hodor-admin",
  audience: "https://hodor.example.com/api/v1",
  tenantId: "self",
  redirectUris: ["https://admin.example.com/oauth/callback"],
  allowInsecureLocalhost: false,
};

const principal: VerifiedSsoPrincipal = {
  issuer: "https://sso.example.com/identity",
  subject: "subject-1",
  userId: "sso-user-1",
  tenantId: "self",
  membershipId: "membership-1",
  clientId: "hodor-admin",
  amr: ["pwd"],
  scope: ["openid", "profile"],
};

describe("SSO domain rules", () => {
  it("标准化持久化连接并要求 ready 状态", () => {
    const values = normalizeSsoConnectionValues(
      {
        issuer: "https://sso.example.com/",
        clientId: " hodor-client ",
        audience: " urn:hodor ",
        allowedTenantId: " tenant-1 ",
        redirectUris: ["https://gate.example.com/sso/callback?intent=login"],
      },
      { allowInsecureLocalhost: false }
    );
    expect(values).toEqual({
      issuer: "https://sso.example.com",
      clientId: "hodor-client",
      audience: "urn:hodor",
      allowedTenantId: "tenant-1",
      redirectUris: ["https://gate.example.com/sso/callback?intent=login"],
    });
    expect(() =>
      toSsoClientConfiguration(
        {
          id: "default",
          ...values,
          status: "draft",
          configVersion: 1,
          lastTestedAtUtc: null,
          updatedByUserId: 1,
          createTimeUtc: 1,
          updateTimeUtc: null,
        },
        { allowInsecureLocalhost: false }
      )
    ).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.CONFIGURATION_NOT_READY })
    );
  });

  it("拒绝重复和不安全的持久化回调地址", () => {
    expect(() =>
      normalizeSsoConnectionValues(
        {
          issuer: "https://sso.example.com",
          clientId: "hodor-client",
          audience: "urn:hodor",
          allowedTenantId: "tenant-1",
          redirectUris: [
            "https://gate.example.com/sso/callback",
            "https://gate.example.com/sso/callback",
          ],
        },
        { allowInsecureLocalhost: false }
      )
    ).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.CONFIGURATION_INVALID })
    );
    expect(() =>
      normalizeSsoConnectionValues(
        {
          issuer: "https://sso.example.com",
          clientId: "hodor-client",
          audience: "urn:hodor",
          allowedTenantId: "tenant-1",
          redirectUris: ["http://gate.example.com/sso/callback"],
        },
        { allowInsecureLocalhost: true }
      )
    ).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.CONFIGURATION_INVALID })
    );
  });

  it("标准化 HTTPS issuer 并拒绝不安全或带查询参数的 issuer", () => {
    expect(
      normalizeSsoIssuer("https://SSO.example.com/identity/", {
        allowInsecureLocalhost: false,
      })
    ).toBe("https://sso.example.com/identity");
    expect(() =>
      normalizeSsoIssuer("http://sso.example.com", {
        allowInsecureLocalhost: true,
      })
    ).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.INVALID_ISSUER })
    );
    expect(() =>
      normalizeSsoIssuer("https://sso.example.com?token=secret", {
        allowInsecureLocalhost: false,
      })
    ).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.INVALID_ISSUER })
    );
  });

  it("仅在配置明确允许时接受 HTTP localhost issuer", () => {
    expect(
      normalizeSsoIssuer("http://localhost:8791/", {
        allowInsecureLocalhost: true,
      })
    ).toBe("http://localhost:8791");
    expect(() =>
      normalizeSsoIssuer("http://localhost:8791", {
        allowInsecureLocalhost: false,
      })
    ).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.INVALID_ISSUER })
    );
  });

  it("只接受 login/bind intent 和精确配置的回调地址", () => {
    expect(parseSsoIntent("login")).toBe("login");
    expect(parseSsoIntent("bind")).toBe("bind");
    expect(() => parseSsoIntent("register")).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.INVALID_REQUEST })
    );
    expect(
      validateSsoRedirectUri(
        "https://admin.example.com/oauth/callback",
        productionConfiguration
      )
    ).toBe("https://admin.example.com/oauth/callback");
    expect(() =>
      validateSsoRedirectUri(
        "https://attacker.example/oauth/callback",
        productionConfiguration
      )
    ).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.INVALID_REDIRECT_URI })
    );
  });

  it("将合法 verifier/challenge 固定为 S256", () => {
    const verifier = "a".repeat(64);
    const challenge = "b".repeat(43);
    expect(createS256PkceInput(verifier, challenge)).toEqual({
      codeVerifier: verifier,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
    });
    expect(() => createS256PkceInput("short", challenge)).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.INVALID_PKCE })
    );
  });

  it.each([
    ["issuer", { ...principal, issuer: "https://other.example.com" }],
    ["client", { ...principal, clientId: "other-client" }],
    ["tenant", { ...principal, tenantId: "other-tenant" }],
  ])("拒绝 %s 不符的验证主体", (_label, candidate) => {
    expect(() =>
      assertPrincipalMatches(candidate, productionConfiguration)
    ).toThrowError(
      expect.objectContaining({ code: SsoErrorCode.PRINCIPAL_MISMATCH })
    );
  });
});
