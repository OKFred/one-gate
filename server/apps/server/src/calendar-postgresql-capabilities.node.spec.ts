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

describe("private calendar PostgreSQL capabilities", () => {
  it("opens exactly the seven ported calendar actions", () => {
    for (const action of [
      "list",
      "get",
      "add",
      "update",
      "cancel",
      "due",
      "ack",
    ])
      expect(supportsPostgresPath(`/personal/calendar/${action}`)).toBe(true);
    for (const path of [
      "/personal/calendar",
      "/personal/calendar/",
      "/personal/calendar/delete",
      "/personal/calendar/due/",
      "/personal/calendar/due/nested",
      "/personal/calendar-admin/list",
      "/personal/health/list",
      "/personal/social/list",
    ])
      expect(supportsPostgresPath(path)).toBe(false);
  });
  it("keeps calendar unavailable to machine credentials", async () => {
    const app = new OpenAPIHono<AppBindings>();
    registerPostgresCapabilities(app, "/api/v1");
    app.post("/api/v1/personal/calendar/due", (context) =>
      context.json({ reached: true })
    );
    expect(
      (await app.request("/api/v1/personal/calendar/due", { method: "POST" }))
        .status
    ).toBe(200);
    expect(
      (
        await app.request("/api/v1/personal/calendar/due", {
          method: "POST",
          headers: { Authorization: "Bearer hdr_synthetic_calendar" },
        })
      ).status
    ).toBe(501);
  });
  it("opens only the three subscription management actions without opening other personal modules", () => {
    for (const action of ["status", "rotate", "revoke"])
      expect(
        supportsPostgresPath(`/personal/calendar/subscription/${action}`)
      ).toBe(true);
    for (const path of [
      "/personal/calendar/subscription",
      "/personal/calendar/subscription/",
      "/personal/calendar/subscription/rotate/nested",
      "/personal/calendar/subscription/token",
      "/personal/calendar/subscription.ics",
      "/personal/health/checkup/list",
    ])
      expect(supportsPostgresPath(path)).toBe(false);
  });
});
