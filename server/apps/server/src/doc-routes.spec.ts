import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { getEnv, setEnv } from "@hodor/core/utils/env.js";

import createApp from "./index.js";

const originalEnv = {
  BASE_API_PATH: getEnv("BASE_API_PATH"),
  NODE_ENV: getEnv("NODE_ENV"),
};

afterEach(() => {
  setEnv(originalEnv);
});

describe("OpenAPI documentation routes", () => {
  it("exposes Swagger, Scalar and OpenAPI JSON during local development", async () => {
    setEnv({ BASE_API_PATH: "/api/v1", NODE_ENV: "development" });
    const app = createApp();

    const swaggerResponse = await app.request("/doc");
    const scalarResponse = await app.request("/doc_ref");
    const documentResponse = await app.request("/doc.json");

    expect(swaggerResponse.status).toBe(200);
    expect(await swaggerResponse.text()).toContain("SwaggerUIBundle");
    expect(scalarResponse.status).toBe(200);
    expect(await scalarResponse.text()).toContain("api-reference");
    expect(documentResponse.status).toBe(200);
    await expect(documentResponse.json()).resolves.toMatchObject({
      openapi: "3.1.0",
    });
  });

  it("keeps documentation routes unavailable in production", async () => {
    setEnv({ BASE_API_PATH: "/api/v1", NODE_ENV: "production" });
    const app = createApp();

    await Promise.all(
      ["/doc", "/doc_ref", "/doc.json"].map(async (path) => {
        expect((await app.request(path)).status).toBe(404);
      })
    );
  });

  it("forces Wrangler local development to use the development environment", () => {
    const packageJson = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../package.json", import.meta.url)),
        "utf8"
      )
    ) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["worker:dev"]).toContain(
      "--var NODE_ENV:development"
    );
  });
});
