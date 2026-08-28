import { OpenAPIHono } from "@hono/zod-openapi";
import { afterEach, describe, expect, it } from "vitest";

import type { AppBindings } from "../../types/app.js";
import { getAllEnv, setEnv } from "../../utils/env.js";
import corsHandler, { resolveAllowedWebOrigins } from "./index.js";

const originalEnv = { ...getAllEnv() };

afterEach(() => {
  setEnv(originalEnv);
});

function createCorsApp(params: {
  environment: string;
  configuredOrigins?: string;
}) {
  setEnv({
    NODE_ENV: params.environment,
    BASE_API_PATH: "/api/v1",
    HODOR_ALLOWED_WEB_ORIGINS: params.configuredOrigins,
  });
  const app = new OpenAPIHono<AppBindings>();
  corsHandler(app);
  app.post("/api/v1/admin/example", (context) => context.json({ ok: true }));
  return app;
}

describe("origin CORS policy", () => {
  it("allows only exact configured HTTPS origins with credentials in production", async () => {
    const app = createCorsApp({
      environment: "production",
      configuredOrigins: "https://gate.example.com,https://admin.example.com",
    });

    const allowed = await app.request("/api/v1/admin/example", {
      method: "POST",
      headers: { Origin: "https://gate.example.com" },
    });
    const malicious = await app.request("/api/v1/admin/example", {
      method: "POST",
      headers: { Origin: "https://gate.example.com.attacker.invalid" },
    });

    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://gate.example.com"
    );
    expect(allowed.headers.get("access-control-allow-credentials")).toBe(
      "true"
    );
    expect(allowed.headers.get("access-control-expose-headers")).toBe(
      "X-Request-Id"
    );
    expect(malicious.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("handles OPTIONS at the origin with the minimal methods and headers", async () => {
    const app = createCorsApp({
      environment: "production",
      configuredOrigins: "https://gate.example.com",
    });
    const response = await app.request("/api/v1/admin/example", {
      method: "OPTIONS",
      headers: {
        Origin: "https://gate.example.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "authorization,content-type,x-request-id",
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://gate.example.com"
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true"
    );
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "POST,OPTIONS"
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Authorization,Content-Type,X-Request-Id"
    );

    const maliciousPreflight = await app.request("/api/v1/admin/example", {
      method: "OPTIONS",
      headers: {
        Origin: "https://gate.example.com.attacker.invalid",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(
      maliciousPreflight.headers.get("access-control-allow-origin")
    ).toBeNull();
  });

  it("fails closed when production origins are missing", async () => {
    const app = createCorsApp({ environment: "production" });
    const response = await app.request("/api/v1/admin/example", {
      method: "POST",
      headers: { Origin: "https://gate.example.com" },
    });

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("accepts only explicitly configured localhost origins outside production", () => {
    expect(
      resolveAllowedWebOrigins(
        "http://localhost:5173,https://remote.example.com,http://127.0.0.1:4173",
        "development"
      )
    ).toEqual(["http://localhost:5173", "http://127.0.0.1:4173"]);
  });
});
