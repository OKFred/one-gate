import { OpenAPIHono } from "@hono/zod-openapi";
import { describe, expect, it } from "vitest";

import type { AppBindings } from "../../types/app.js";
import logHandler, { type HodorRequestLogEvent } from "./index.js";

describe("Hodor request logger", () => {
  it("propagates a safe request id and logs one bounded completion event", async () => {
    const events: HodorRequestLogEvent[] = [];
    const app = new OpenAPIHono<AppBindings>();
    let now = 1_000;
    logHandler(app, {
      clock: { now: () => (now += 5) },
      logger: { info: (event) => events.push(event) },
    });
    app.get("/healthz", (context) => context.json({ status: "ok" }));

    const response = await app.request("/healthz?token=sensitive-sentinel", {
      headers: { "x-request-id": "caller-request-123" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("caller-request-123");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: "http.request.completed",
      requestId: "caller-request-123",
      method: "GET",
      route: "/healthz",
      status: 200,
    });
    expect(JSON.stringify(events[0])).not.toContain("sensitive-sentinel");
    expect(JSON.stringify(events[0])).not.toContain("token");
  });

  it("replaces unsafe request ids and bounds unmatched routes", async () => {
    const events: HodorRequestLogEvent[] = [];
    const app = new OpenAPIHono<AppBindings>();
    logHandler(app, {
      createRequestId: () => "generated-request-456",
      logger: { info: (event) => events.push(event) },
    });

    const response = await app.request("/missing/private-value", {
      headers: { "x-request-id": "unsafe request id" },
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("x-request-id")).toBe("generated-request-456");
    expect(events[0]?.route).toBe("unmatched");
    expect(JSON.stringify(events[0])).not.toContain("private-value");
  });
});
