import { OpenAPIHono } from "@hono/zod-openapi";
import { describe, expect, it, vi } from "vitest";
import type { AppBindings } from "@hodor/core/types/app";
import {
  registerPostgresCapabilities,
  supportsPostgresPath,
} from "./postgresql-capabilities";

vi.mock("@hodor/core/db/postgresql/runtime.js", () => ({
  isPostgresBackend: () => true,
}));

describe("Tianditu PostgreSQL capability boundary", () => {
  it("only opens the database-independent browser configuration action", () => {
    expect(supportsPostgresPath("/admin/base/map/config")).toBe(true);
    for (const path of [
      "/admin/base/map",
      "/admin/base/map/",
      "/admin/base/map/config/",
      "/admin/base/map/config/nested",
      "/admin/base/map/other",
      "/admin/base/map-secret/config",
      "/admin/base/webhook_config/list",
      "/admin/ai/chat/ask",
    ])
      expect(supportsPostgresPath(path)).toBe(false);
  });

  it("retains the existing machine credential boundary", async () => {
    const app = new OpenAPIHono<AppBindings>();
    registerPostgresCapabilities(app, "/api/v1");
    app.post("/api/v1/admin/base/map/config", (context) =>
      context.json({ reached: true })
    );
    const userResponse = await app.request("/api/v1/admin/base/map/config", {
      method: "POST",
    });
    expect(userResponse.status).toBe(200);
    const machineResponse = await app.request("/api/v1/admin/base/map/config", {
      method: "POST",
      headers: { Authorization: "Bearer hdr_synthetic_map_machine" },
    });
    expect(machineResponse.status).toBe(501);
    expect(await machineResponse.json()).toMatchObject({
      ok: false,
      code: "POSTGRESQL_CAPABILITY_UNAVAILABLE",
    });
  });
});
