import { OpenAPIHono } from "@hono/zod-openapi";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { AppBindings } from "@hodor/core/types/app.js";
import { getAllEnv, setEnv } from "@hodor/core/utils/env.js";

import {
  createCloudflareAccessJwtVerifier,
  registerCloudflareAccessOrigin,
  resolveAccessRequirement,
  type CloudflareAccessConfig,
  type CloudflareAccessLogEvent,
} from "./cloudflare-access.js";

const accessConfig: CloudflareAccessConfig = {
  issuer: "https://example.cloudflareaccess.com",
  audience: "hodor-access-audience",
};

const originalEnv = { ...getAllEnv() };
let privateKey: CryptoKey;
let verifyAssertion: (assertion: string) => Promise<void>;

beforeAll(async () => {
  const keyPair = await generateKeyPair("RS256");
  privateKey = keyPair.privateKey;
  const publicJwk = await exportJWK(keyPair.publicKey);
  publicJwk.kid = "access-test-key";
  verifyAssertion = createCloudflareAccessJwtVerifier(
    accessConfig,
    createLocalJWKSet({ keys: [publicJwk] })
  );
});

afterEach(() => {
  setEnv(originalEnv);
});

async function createAssertion(params?: {
  issuer?: string;
  audience?: string;
  expiresAt?: number;
  signingKey?: CryptoKey;
  includeExpiration?: boolean;
}): Promise<string> {
  const token = new SignJWT({ email: "sensitive@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "access-test-key" })
    .setIssuer(params?.issuer ?? accessConfig.issuer)
    .setAudience(params?.audience ?? accessConfig.audience)
    .setIssuedAt();
  if (params?.includeExpiration !== false) {
    token.setExpirationTime(
      params?.expiresAt ?? Math.floor(Date.now() / 1000) + 60
    );
  }
  return token.sign(params?.signingKey ?? privateKey);
}

function createTestApp(logs: CloudflareAccessLogEvent[]) {
  setEnv({
    NODE_ENV: "production",
    BASE_API_PATH: "/api/v1",
    CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
    CF_ACCESS_APPLICATION_AUDIENCE: accessConfig.audience,
  });
  const app = new OpenAPIHono<AppBindings>();
  app.use("*", async (context, next) => {
    context.set("requestId", "req_access_test");
    await next();
    context.header("x-request-id", "req_access_test");
  });
  registerCloudflareAccessOrigin(app, {
    verifyAssertion: async (assertion, config) => {
      expect(config).toEqual(accessConfig);
      await verifyAssertion(assertion);
    },
    logger: { write: (event) => logs.push(event) },
    now: () => new Date("2026-08-27T00:00:00.000Z"),
  });
  app.all("*", (context) => context.text("ok"));
  return app;
}

describe("Cloudflare Access JWT verification", () => {
  it("accepts a signed assertion with exact issuer, audience and exp", async () => {
    await expect(
      verifyAssertion(await createAssertion())
    ).resolves.toBeUndefined();
  });

  it.each([
    ["issuer", { issuer: "https://other.cloudflareaccess.com" }],
    ["audience", { audience: "other-audience" }],
    ["expiration", { expiresAt: Math.floor(Date.now() / 1000) - 1 }],
  ])("rejects an assertion with invalid %s", async (_label, params) => {
    await expect(
      verifyAssertion(await createAssertion(params))
    ).rejects.toThrow();
  });

  it("rejects a forged assertion", async () => {
    const forgedKeyPair = await generateKeyPair("RS256");
    await expect(
      verifyAssertion(
        await createAssertion({ signingKey: forgedKeyPair.privateKey })
      )
    ).rejects.toThrow();
  });

  it("rejects an assertion without exp", async () => {
    await expect(
      verifyAssertion(await createAssertion({ includeExpiration: false }))
    ).rejects.toThrow();
  });
});

describe("Cloudflare Access origin middleware", () => {
  it("rejects missing and forged assertions without logging sensitive values", async () => {
    const logs: CloudflareAccessLogEvent[] = [];
    const app = createTestApp(logs);

    const missingResponse = await app.request(
      "/api/v1/admin/system/auth/login?email=sensitive@example.com"
    );
    const forgedResponse = await app.request(
      "/api/v1/admin/system/auth/login?token=sensitive-token",
      { headers: { "cf-access-jwt-assertion": "forged.jwt.value" } }
    );

    expect(missingResponse.status).toBe(403);
    expect(forgedResponse.status).toBe(403);
    await expect(missingResponse.json()).resolves.toMatchObject({
      data: { requestId: "req_access_test" },
    });
    expect(logs.map((event) => event.authOutcome)).toEqual([
      "denied_missing",
      "denied_invalid",
    ]);
    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain("sensitive@example.com");
    expect(serializedLogs).not.toContain("sensitive-token");
    expect(serializedLogs).not.toContain("forged.jwt.value");
  });

  it("allows a valid assertion on browser-anonymous and default admin routes", async () => {
    const logs: CloudflareAccessLogEvent[] = [];
    const app = createTestApp(logs);
    const assertion = await createAssertion();

    for (const path of [
      "/api/v1/admin/system/auth/login",
      "/api/v1/admin/system/user/list",
    ]) {
      const response = await app.request(path, {
        headers: { "cf-access-jwt-assertion": assertion },
      });
      expect(response.status).toBe(200);
    }
    expect(logs.map((event) => event.authOutcome)).toEqual([
      "allowed",
      "allowed",
    ]);
  });

  it("bypasses only declared machine routes and rejects similar prefixes", async () => {
    const logs: CloudflareAccessLogEvent[] = [];
    const app = createTestApp(logs);

    expect(
      (await app.request("/api/v1/admin/mobile/device/report/presence")).status
    ).toBe(200);
    expect(
      (await app.request("/api/v1/admin/mobile/device/report/presence-extra"))
        .status
    ).toBe(403);
    expect(logs.map((event) => event.authOutcome)).toEqual([
      "bypassed_machine",
      "denied_missing",
    ]);
  });

  it("keeps the blocked legacy callback protected instead of bypassing it", async () => {
    const logs: CloudflareAccessLogEvent[] = [];
    const app = createTestApp(logs);
    const response = await app.request(
      "/api/v1/admin/mobile/device-app/callback"
    );

    expect(response.status).toBe(403);
    expect(logs.at(-1)?.authOutcome).toBe("denied_missing");
  });

  it("fails closed when production Access configuration is missing", async () => {
    const logs: CloudflareAccessLogEvent[] = [];
    const app = createTestApp(logs);
    setEnv({ CF_ACCESS_APPLICATION_AUDIENCE: undefined });

    const response = await app.request("/api/v1/admin/system/auth/login");
    expect(response.status).toBe(403);
    expect(logs.at(-1)?.authOutcome).toBe("denied_configuration");
  });

  it("lets OPTIONS reach origin without an Access assertion", async () => {
    const logs: CloudflareAccessLogEvent[] = [];
    const app = createTestApp(logs);
    const response = await app.request("/api/v1/admin/system/auth/login", {
      method: "OPTIONS",
    });

    expect(response.status).toBe(200);
    expect(logs.at(-1)?.authOutcome).toBe("bypassed_preflight");
  });

  it("can be explicitly disabled outside production", async () => {
    const logs: CloudflareAccessLogEvent[] = [];
    const app = createTestApp(logs);
    setEnv({
      NODE_ENV: "development",
      HODOR_ACCESS_ORIGIN_VALIDATION_ENABLED: "false",
    });

    const response = await app.request("/api/v1/admin/system/auth/login");
    expect(response.status).toBe(200);
    expect(logs.at(-1)?.authOutcome).toBe("disabled_non_production");
  });
});

describe("Access route requirements", () => {
  it("strips BASE_API_PATH and preserves manifest security boundaries", () => {
    expect(
      resolveAccessRequirement(
        "/api/v1/admin/mobile/device-ops/ws/session_12345678",
        "/api/v1"
      )
    ).toBe("websocket-bypass");
    expect(
      resolveAccessRequirement(
        "/api/v1/admin/mobile/device-app/callback",
        "/api/v1"
      )
    ).toBe("required");
    expect(
      resolveAccessRequirement(
        "/other/api/v1/admin/system/auth/login",
        "/api/v1"
      )
    ).toBe("not-applicable");
  });
});
