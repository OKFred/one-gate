import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import { getEnv, setEnv } from "@hodor/core/utils/env.js";
import {
  InMemoryTotpAttemptCoordinator,
  createTotpGateCenter,
} from "@hodor/admin/system/auth/totp-gate/index.js";

import createApp from "./index.js";

const originalEnv = {
  BASE_API_PATH: getEnv("BASE_API_PATH"),
  NODE_ENV: getEnv("NODE_ENV"),
};
const coordinator = new InMemoryTotpAttemptCoordinator();

function createTestApp() {
  return createApp({
    resolveTotpGateCenter: () => createTotpGateCenter(coordinator),
  });
}

afterEach(() => {
  setEnv(originalEnv);
});

describe("OpenAPI documentation routes", () => {
  it("exposes Swagger, Scalar and OpenAPI JSON during local development", async () => {
    setEnv({ BASE_API_PATH: "/api/v1", NODE_ENV: "development" });
    const app = createTestApp();

    const swaggerResponse = await app.request("/doc");
    const scalarResponse = await app.request("/doc_ref");
    const documentResponse = await app.request("/doc.json");

    expect(swaggerResponse.status).toBe(200);
    expect(await swaggerResponse.text()).toContain("SwaggerUIBundle");
    expect(scalarResponse.status).toBe(200);
    expect(await scalarResponse.text()).toContain("api-reference");
    expect(documentResponse.status).toBe(200);
    const document = (await documentResponse.json()) as {
      openapi?: string;
      paths?: Record<string, unknown>;
    };
    expect(document.openapi).toBe("3.1.0");
    expect(document.paths).toHaveProperty(
      "/api/v1/admin/system/auth/gate/status"
    );
    expect(document.paths).toHaveProperty(
      "/api/v1/admin/system/auth/gate/verify"
    );
    expect(document.paths).toHaveProperty(
      "/api/v1/admin/system/auth/gate/logout"
    );
    expect(document.paths).toHaveProperty(
      "/api/v1/admin/system/auth/sso/config/get"
    );
    expect(document.paths).toHaveProperty(
      "/api/v1/admin/system/auth/sso/config/save"
    );
    expect(document.paths).toHaveProperty(
      "/api/v1/admin/system/auth/sso/config/test"
    );
    expect(document.paths).toHaveProperty(
      "/api/v1/admin/system/auth/sso/config/disable"
    );
    expect(document.paths).not.toHaveProperty(
      "/api/v1/admin/system/auth/oauth/login/url"
    );
    expect(document.paths).not.toHaveProperty(
      "/api/v1/admin/system/auth/oauth/login/callback"
    );
    expect(document.paths).not.toHaveProperty(
      "/api/v1/admin/system/auth/wechat"
    );
  });

  it("keeps documentation routes unavailable in production", async () => {
    setEnv({ BASE_API_PATH: "/api/v1", NODE_ENV: "production" });
    const app = createTestApp();

    await Promise.all(
      ["/doc", "/doc_ref", "/doc.json"].map(async (path) => {
        expect((await app.request(path)).status).toBe(404);
      })
    );
  });

  it("returns the shared JSON 404 envelope for retired direct-provider routes", async () => {
    setEnv({ BASE_API_PATH: "/api/v1", NODE_ENV: "development" });
    const app = createTestApp();

    await Promise.all(
      [
        "/api/v1/admin/system/auth/oauth/login/url",
        "/api/v1/admin/system/auth/oauth/login/callback",
        "/api/v1/admin/system/auth/oauth/account/url",
        "/api/v1/admin/system/auth/oauth/account/callback",
        "/api/v1/admin/system/auth/oauth/binding/unbind",
        "/api/v1/admin/system/auth/oauth/binding/profile",
        "/api/v1/admin/system/auth/wechat",
      ].map(async (path) => {
        const response = await app.request(path, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
        expect(response.status).toBe(404);
        expect(response.headers.get("content-type")).toContain(
          "application/json"
        );
        const payload = (await response.json()) as {
          readonly ok?: boolean;
          readonly data?: Readonly<Record<string, unknown>>;
        };
        expect(payload.ok).toBe(false);
        expect(payload.data).toEqual({});
      })
    );
  });

  it("forces Wrangler local development to use the development environment", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["worker:dev"]).toContain(
      "--var NODE_ENV:development"
    );
  });
});
