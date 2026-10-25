import { OpenAPIHono } from "@hono/zod-openapi";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppBindings, UserObj } from "@hodor/core/types/app";
import {
  BusinessError,
  toHttpException,
} from "@hodor/core/middleware/errorHandler/businessError";
import { getEnv, setEnv } from "@hodor/core/utils/env";
import { tokenUtils } from "@hodor/core/utils/token";
import {
  getTotpGateCookieName,
  InMemoryTotpAttemptCoordinator,
  TotpGateCenter,
} from "../../system/auth/totp-gate";
import { WebCryptoTotpGateCryptography } from "../../system/auth/totp-gate/infrastructure/web-crypto";
import { registerTotpGateMiddleware } from "../../../../../apps/server/src/security/totp-gate";
import createMap from "./index";
import { readMapConfiguration } from "./service";

const fixtures = vi.hoisted(() => ({
  userEnabled: true,
  tokenActive: true,
  updateLastUsedTime: vi.fn(async () => undefined),
}));

// Keep the actual JWT, authentication, TOTP gate and route encapsulation code.
// These fixtures replace only stored identity records, without database access.
vi.mock("@hodor/admin/common/registry", () => ({
  registry: {
    system: {
      getUser: async (id: number) =>
        fixtures.userEnabled
          ? {
              id,
              username: "synthetic-map-user",
              langCode: "en-US",
              isEnabled: true,
              roleArr: [],
            }
          : null,
      getAuthorizationRoles: async () => [],
    },
  },
}));
vi.mock("@hodor/admin/system/api-token/repository", () => ({
  apiTokenRepository: {
    findByTokenHash: async () =>
      fixtures.tokenActive
        ? {
            id: 41,
            status: "active",
            startTimeUtc: null,
            expireTimeUtc: null,
            ipWhitelist: null,
            permissions: "[]",
            name: "synthetic-map-machine",
            creatorId: 7,
            createTimeUtc: 1,
          }
        : null,
    updateLastUsedTime: fixtures.updateLastUsedTime,
  },
}));
vi.mock("@hodor/core/utils/i18n/index.js", () => ({
  getTranslator: async () => async (key: string) => key,
}));

const endpoint = "/api/v1/admin/base/map/config";
const browserKey = "a".repeat(32);
const originalEnv = {
  BASE_API_PATH: getEnv("BASE_API_PATH"),
  NODE_ENV: getEnv("NODE_ENV"),
  JWT_SECRET: getEnv("JWT_SECRET"),
  TIANDITU_BROWSER_KEY: getEnv("TIANDITU_BROWSER_KEY"),
};

function fixture(withGate = true) {
  const app = new OpenAPIHono<AppBindings>();
  const clock = Date.now();
  const cryptography = new WebCryptoTotpGateCryptography();
  // Public RFC 6238 example material, exclusively for this isolated fixture.
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  const center = new TotpGateCenter({
    clock: { now: () => clock },
    secrets: { read: () => secret },
    cryptography,
    coordinator: new InMemoryTotpAttemptCoordinator(),
    audit: { write: () => undefined },
  });
  app.use("*", async (context, next) => {
    context.header("Vary", "Origin");
    context.set("requestId", "synthetic-map-request");
    await next();
  });
  app.onError((error, context) => {
    if (!(error instanceof BusinessError)) throw error;
    return context.json(
      { ok: false, code: error.code },
      toHttpException(error).status
    );
  });
  if (withGate)
    registerTotpGateMiddleware(app, {
      baseApiPath: "/api/v1",
      resolveTotpGateCenter: () => center,
    });
  app.route("/api/v1/admin/base/map", createMap());

  async function session() {
    const token = tokenUtils.generateToken({
      userId: 7,
      username: "synthetic-map-user",
    });
    const payload = tokenUtils.verifyToken(token);
    if (!payload) throw new Error("Synthetic token generation failed");
    const candidates = await cryptography.createCandidates(secret, clock);
    const verification = await center.verify({
      primary: { userId: 7, token, expiresAtMs: payload.exp },
      clientIdentity: "synthetic-map-client",
      code: candidates[1].code,
      requestId: "synthetic-map-verification",
    });
    return {
      Authorization: `Bearer ${token}`,
      Cookie: `${getTotpGateCookieName()}=${verification.cookieValue}`,
    };
  }
  function request(
    headers: Record<string, string> = {},
    body: object = {},
    method = "POST"
  ) {
    return app.request(endpoint, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    });
  }
  return { request, session };
}

describe("authenticated Tianditu browser configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixtures.userEnabled = true;
    fixtures.tokenActive = true;
    setEnv({
      BASE_API_PATH: "/api/v1",
      NODE_ENV: "production",
      JWT_SECRET: "synthetic-map-fixture-signing-material",
      TIANDITU_BROWSER_KEY: browserKey,
    });
  });
  afterAll(() => setEnv(originalEnv));

  it("denies anonymous requests through the global authentication gate", async () => {
    const response = await fixture().request();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "NOT_AUTHENTICATED",
    });
  });

  it("keeps encapsulation authenticated even without the outer TOTP middleware", async () => {
    const response = await fixture(false).request();
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(browserKey);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects an invalid user token", async () => {
    const response = await fixture().request({
      Authorization: "Bearer synthetic-invalid-user-token",
    });
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(browserKey);
  });

  it("rejects a disabled authenticated user", async () => {
    const app = fixture();
    const headers = await app.session();
    fixtures.userEnabled = false;
    const response = await app.request(headers);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(browserKey);
  });

  it("requires secondary verification for a valid user token", async () => {
    const token = tokenUtils.generateToken({
      userId: 7,
      username: "synthetic-map-user",
    });
    const response = await fixture().request({
      Authorization: `Bearer ${token}`,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      ok: false,
      code: "TOTP_GATE_REQUIRED",
    });
  });

  it("rejects an invalid secondary verification cookie", async () => {
    const app = fixture();
    const headers = await app.session();
    const response = await app.request({
      ...headers,
      Cookie: `${getTotpGateCookieName()}=synthetic-invalid-cookie`,
    });
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(browserKey);
  });

  it("does not issue a browser key to a valid API token", async () => {
    const response = await fixture().request({
      Authorization: "Bearer hdr_synthetic_map_machine",
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      code: "PERMISSION_DENIED",
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(fixtures.updateLastUsedTime).toHaveBeenCalledExactlyOnceWith(41);
  });

  it("rejects an invalid API token before configuration access", async () => {
    fixtures.tokenActive = false;
    const response = await fixture().request({
      Authorization: "Bearer hdr_synthetic_map_machine",
    });
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(browserKey);
  });

  it("allows a verified ordinary user without a new business permission", async () => {
    const app = fixture();
    const response = await app.request(await app.session());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      message: "OK",
      data: { configured: true, browserKey },
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")?.split(/,\s*/).sort()).toEqual([
      "Authorization",
      "Cookie",
      "Origin",
    ]);
  });

  it.each([
    undefined,
    "",
    "   ",
    "not-a-browser-key",
    "a".repeat(31),
    "a".repeat(33),
    "z".repeat(32),
    123,
    { key: "synthetic-invalid-value" },
  ])(
    "returns an unconfigured result for an invalid environment value %#",
    async (value) => {
      setEnv({ TIANDITU_BROWSER_KEY: value });
      const app = fixture();
      const response = await app.request(await app.session());
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ok: true,
        message: "OK",
        data: { configured: false, browserKey: null },
      });
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    }
  );

  it("trims whitespace without changing the configured key casing", async () => {
    const uppercaseKey = "A".repeat(32);
    setEnv({ TIANDITU_BROWSER_KEY: ` \n${uppercaseKey}\t ` });
    const app = fixture();
    expect(await (await app.request(await app.session())).json()).toMatchObject(
      {
        data: { configured: true, browserKey: uppercaseKey },
      }
    );
  });

  it("reads current server configuration rather than retaining a module snapshot", async () => {
    const app = fixture();
    const headers = await app.session();
    expect(await (await app.request(headers)).json()).toMatchObject({
      data: { browserKey },
    });
    setEnv({ TIANDITU_BROWSER_KEY: "b".repeat(32) });
    expect(await (await app.request(headers)).json()).toMatchObject({
      data: { browserKey: "b".repeat(32) },
    });
    setEnv({ TIANDITU_BROWSER_KEY: "" });
    expect(await (await app.request(headers)).json()).toMatchObject({
      data: { configured: false, browserKey: null },
    });
  });

  it("rejects client-supplied configuration and unexpected fields", async () => {
    const app = fixture();
    const response = await app.request(await app.session(), {
      browserKey: "b".repeat(32),
    });
    expect(response.status).toBe(422);
    expect(await response.text()).not.toContain(browserKey);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("does not register a GET credential endpoint", async () => {
    const app = fixture();
    const response = await app.request(await app.session(), {}, "GET");
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(browserKey);
  });

  it("guards direct service invocation against missing or machine principals", async () => {
    await expect(readMapConfiguration({}, undefined)).rejects.toMatchObject({
      code: "NOT_AUTHENTICATED",
    });
    const machine: UserObj = {
      principal: { kind: "api_token", tokenId: 41 },
      id: 7,
      userId: 7,
      username: "synthetic-machine",
      langCode: "en-US",
      token: "hdr_synthetic_map_machine",
      isEnabled: true,
      isSuperAdmin: true,
      roleIds: [1],
      permissions: [],
      dataScope: "all",
      customDeptIds: [],
      ensureLoaded: async () => undefined,
    };
    await expect(readMapConfiguration({}, machine)).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
  });
});
