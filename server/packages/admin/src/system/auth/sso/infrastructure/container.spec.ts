import { setEnv } from "@hodor/core/utils/env";
import { beforeEach, describe, expect, it } from "vitest";
import { resolveSsoConfiguration, SsoConfigurationError } from "./container.js";

const SENSITIVE_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function configure(overrides: Record<string, string> = {}): void {
  setEnv({
    NODE_ENV: "production",
    SSO_ISSUER: "https://sso.example.com",
    SSO_CLIENT_ID: "hodor-client",
    SSO_AUDIENCE: "https://api.example.com",
    SSO_ALLOWED_TENANT_ID: "tenant-1",
    SSO_ALLOWED_REDIRECT_URIS: "https://gate.example.com/sso/callback",
    OAUTH_SENSITIVE_DATA_KEY: SENSITIVE_KEY,
    ...overrides,
  });
}

describe("SSO infrastructure configuration", () => {
  beforeEach(() => configure());

  it("严格解析生产配置并关闭 HTTP localhost", () => {
    expect(resolveSsoConfiguration()).toEqual({
      issuer: "https://sso.example.com",
      clientId: "hodor-client",
      audience: "https://api.example.com",
      tenantId: "tenant-1",
      redirectUris: ["https://gate.example.com/sso/callback"],
      allowInsecureLocalhost: false,
    });
  });

  it("生产环境拒绝 HTTP issuer 和 redirect URI", () => {
    configure({ SSO_ISSUER: "http://localhost:8787" });
    expect(() => resolveSsoConfiguration()).toThrow(SsoConfigurationError);

    configure({
      SSO_ISSUER: "https://sso.example.com",
      SSO_ALLOWED_REDIRECT_URIS: "http://localhost:5173/sso/callback",
    });
    expect(() => resolveSsoConfiguration()).toThrow(SsoConfigurationError);
  });

  it("开发环境只允许 localhost 使用 HTTP", () => {
    configure({
      NODE_ENV: "development",
      SSO_ISSUER: "http://localhost:8787",
      SSO_ALLOWED_REDIRECT_URIS: "http://localhost:5173/sso/callback",
    });
    expect(resolveSsoConfiguration().allowInsecureLocalhost).toBe(true);

    configure({
      NODE_ENV: "development",
      SSO_ISSUER: "http://sso.example.com",
    });
    expect(() => resolveSsoConfiguration()).toThrow(SsoConfigurationError);
  });
});
