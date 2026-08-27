import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { webCryptoSsoHash } from "./crypto.js";
import {
  createSsoOidcProvider,
  type SsoOidcOutboundLogEvent,
} from "./oidc-provider.js";

const issuer = "https://sso.example.com";
const clientId = "hodor-public-client";
const audience = "https://hodor.example.com/api/v1";
const redirectUri = "https://gate.example.com/sso/callback";
const nonce = "nonce-sensitive-sentinel";
const now = Math.floor(Date.now() / 1000);
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
let jwk: Awaited<ReturnType<typeof exportJWK>>;

beforeAll(async () => {
  const pair = await generateKeyPair("EdDSA");
  privateKey = pair.privateKey;
  jwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "EdDSA" };
});

function discovery(overrides: Record<string, unknown> = {}): Response {
  return Response.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth2/authorize`,
    token_endpoint: `${issuer}/oauth2/token`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    code_challenge_methods_supported: ["S256"],
    ...overrides,
  });
}

async function signToken(
  claims: Record<string, unknown>,
  tokenAudience: string
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
    .setIssuer(issuer)
    .setAudience(tokenAudience)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(privateKey);
}

async function validTokens(
  overrides: {
    access?: Record<string, unknown>;
    id?: Record<string, unknown>;
    accessAudience?: string;
    idAudience?: string;
  } = {}
): Promise<{ accessToken: string; idToken: string }> {
  const accessToken = await signToken(
    {
      sub: "user-1",
      tenantId: "tenant-1",
      membershipId: "membership-1",
      clientId,
      amr: ["local"],
      scope: "openid profile email",
      ...overrides.access,
    },
    overrides.accessAudience ?? audience
  );
  const idToken = await signToken(
    { sub: "user-1", nonce, ...overrides.id },
    overrides.idAudience ?? clientId
  );
  return { accessToken, idToken };
}

function createFetcher(tokens?: { accessToken: string; idToken: string }) {
  return vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const request =
      input instanceof Request ? input.clone() : new Request(input);
    const url = new URL(request.url);
    if (url.pathname === "/.well-known/openid-configuration") {
      return discovery();
    }
    if (url.pathname === "/oauth2/token") {
      return Response.json({
        access_token: tokens?.accessToken ?? "missing",
        id_token: tokens?.idToken ?? "missing",
        token_type: "Bearer",
      });
    }
    if (url.pathname === "/.well-known/jwks.json") {
      return Response.json({ keys: [jwk] });
    }
    return new Response(null, { status: 404 });
  });
}

describe("SSO OIDC provider", () => {
  it("校验 discovery 并生成标准 S256 授权 URL", async () => {
    const fetcher = createFetcher();
    const provider = createSsoOidcProvider({ fetch: fetcher });
    const url = new URL(
      await provider.createAuthorizationUrl({
        requestId: "request-authorization",
        issuer,
        clientId,
        redirectUri,
        state: "state-sensitive-sentinel",
        nonce,
        pkce: {
          codeChallenge: "challenge-sensitive-sentinel",
          codeChallengeMethod: "S256",
        },
      })
    );

    expect(url.origin + url.pathname).toBe(`${issuer}/oauth2/authorize`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "openid profile email",
      state: "state-sensitive-sentinel",
      nonce,
      code_challenge: "challenge-sensitive-sentinel",
      code_challenge_method: "S256",
    });
  });

  it.each([
    ["issuer 不匹配", { issuer: "https://evil.example.com" }],
    [
      "authorization endpoint 跨源",
      { authorization_endpoint: "https://evil.example.com/authorize" },
    ],
    ["JWKS 带 query", { jwks_uri: `${issuer}/jwks?target=evil` }],
  ])("拒绝恶意 discovery：%s", async (_name, overrides) => {
    const provider = createSsoOidcProvider({
      fetch: vi.fn(async () => discovery(overrides)),
    });
    await expect(
      provider.createAuthorizationUrl({
        requestId: "request-malicious-discovery",
        issuer,
        clientId,
        redirectUri,
        state: "state",
        nonce,
        pkce: { codeChallenge: "challenge", codeChallengeMethod: "S256" },
      })
    ).rejects.toMatchObject({ code: "DISCOVERY_FAILED" });
  });

  it("拒绝未声明 S256 的 provider", async () => {
    const provider = createSsoOidcProvider({
      fetch: vi.fn(async () =>
        discovery({ code_challenge_methods_supported: ["plain"] })
      ),
    });
    await expect(
      provider.createAuthorizationUrl({
        requestId: "request-no-s256",
        issuer,
        clientId,
        redirectUri,
        state: "state",
        nonce,
        pkce: { codeChallenge: "challenge", codeChallengeMethod: "S256" },
      })
    ).rejects.toThrow("S256");
  });

  it("public client 换码不发送 secret，并严格验证 EdDSA 主体", async () => {
    const tokens = await validTokens();
    const fetcher = createFetcher(tokens);
    const provider = createSsoOidcProvider({ fetch: fetcher });
    const principal = await provider.exchangeCode({
      requestId: "request-token-success",
      issuer,
      clientId,
      audience,
      redirectUri,
      code: "code-sensitive-sentinel",
      codeVerifier: "verifier-sensitive-sentinel",
      expectedNonceDigest: await webCryptoSsoHash.sha256Base64Url(nonce),
    });

    expect(principal).toEqual({
      issuer,
      subject: "user-1",
      userId: "user-1",
      tenantId: "tenant-1",
      membershipId: "membership-1",
      clientId,
      amr: ["local"],
      scope: ["openid", "profile", "email"],
    });
    const tokenRequest = fetcher.mock.calls
      .map(([input]) => new Request(input))
      .find((request) => new URL(request.url).pathname === "/oauth2/token");
    expect(tokenRequest).toBeDefined();
    const body = await tokenRequest?.text();
    expect(body).toContain(`resource=${encodeURIComponent(audience)}`);
    expect(body).not.toContain("client_secret");
  });

  it.each([
    ["access audience", { accessAudience: "https://evil.example.com" }],
    ["ID audience", { idAudience: "another-client" }],
    ["ID subject", { id: { sub: "user-2" } }],
    ["client claim", { access: { clientId: "another-client" } }],
    ["tenant claim", { access: { tenantId: "" } }],
  ])("拒绝错误 claims：%s", async (_name, overrides) => {
    const tokens = await validTokens(overrides);
    const provider = createSsoOidcProvider({
      fetch: createFetcher(tokens),
    });
    await expect(
      provider.exchangeCode({
        requestId: "request-invalid-claims",
        issuer,
        clientId,
        audience,
        redirectUri,
        code: "code",
        codeVerifier: "verifier",
        expectedNonceDigest: await webCryptoSsoHash.sha256Base64Url(nonce),
      })
    ).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });

  it("token endpoint 拒绝时只记录 metadata 并传播 requestId", async () => {
    const logs: SsoOidcOutboundLogEvent[] = [];
    const sentinel =
      "code-sensitive verifier-sensitive token-sensitive 13800138000";
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = new Request(input);
      if (new URL(request.url).pathname === "/oauth2/token") {
        expect(request.headers.get("x-request-id")).toBe("request-123");
        return Response.json({ error: sentinel }, { status: 400 });
      }
      return discovery();
    });
    const provider = createSsoOidcProvider({
      fetch: fetcher,
      log: (event) => {
        logs.push(event);
      },
    });
    await expect(
      provider.exchangeCode({
        requestId: "request-123",
        issuer,
        clientId,
        audience,
        redirectUri,
        code: sentinel,
        codeVerifier: sentinel,
        expectedNonceDigest: "digest-sensitive",
      })
    ).rejects.toMatchObject({ code: "TOKEN_REJECTED" });

    expect(logs.some((event) => event.operation === "token")).toBe(true);
    expect(JSON.stringify(logs)).not.toContain(sentinel);
    expect(JSON.stringify(logs)).not.toContain("13800138000");
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId: "request-123",
          operation: "token",
          upstreamHost: "sso.example.com",
          upstreamPath: "/oauth2/token",
          status: 400,
          outcome: "rejected",
        }),
      ])
    );
  });
});
