import { describe, expect, it, vi } from "vitest";

const constructors = vi.hoisted(() => ({
  MobileOpsSession: class {},
  TotpGateCoordinator: class {},
}));

vi.mock("./mobile-ops-session.js", () => ({
  MobileOpsSession: constructors.MobileOpsSession,
}));
vi.mock("./totp-gate-coordinator.js", () => ({
  TotpGateCoordinator: constructors.TotpGateCoordinator,
}));
vi.mock("./index.js", () => {
  throw new Error("Maintenance must not load the application");
});
vi.mock("@hodor/admin/maintenance/cron/scheduler.js", () => {
  throw new Error("Maintenance must not load pending jobs");
});
vi.mock("./soft-delete-cleanup.js", () => {
  throw new Error("Maintenance must not load retention cleanup");
});

import worker, {
  MobileOpsSession,
  TotpGateCoordinator,
} from "./maintenance-worker.js";

function rejectAccess<T extends object>(target: T): T {
  return new Proxy(target, {
    get(_target, property) {
      throw new Error(`Maintenance accessed ${String(property)}`);
    },
  });
}

describe("Department migration maintenance Worker", () => {
  it.each([
    ["GET", "/healthCheck"],
    ["GET", "/version.json"],
    ["POST", "/api/v1/admin/system/department/delete"],
    ["POST", "/api/v1/admin/maintenance/recycle-bin/purge"],
    ["OPTIONS", "/api/v1/admin/system/department/delete"],
    ["GET", "/api/v1/admin/mobile/device-ops/ws/ops_12345678"],
  ])(
    "blocks %s %s without accessing bindings or scheduling work",
    async (method, path) => {
      const request = new Request(`https://example.test${path}`, {
        method,
        headers: path.includes("/ws/") ? { Upgrade: "websocket" } : undefined,
      });
      const env = rejectAccess({} as Env);
      const ctx = rejectAccess({} as ExecutionContext);

      const response = worker.fetch(request, env, ctx);

      expect(response.status).toBe(503);
      expect(response.headers.get("Retry-After")).toBe("60");
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("X-Hodor-Maintenance")).toBe(
        "department-soft-delete"
      );
      expect(await response.text()).toBe(
        "Service temporarily unavailable for maintenance."
      );
    }
  );

  it("accepts scheduled events without accessing bindings or queuing tasks", () => {
    const event = rejectAccess({} as ScheduledController);
    const env = rejectAccess({} as Env);
    const ctx = rejectAccess({} as ExecutionContext);

    expect(worker.scheduled(event, env, ctx)).toBeUndefined();
  });

  it("retains the existing Durable Object class exports", () => {
    expect(MobileOpsSession).toBe(constructors.MobileOpsSession);
    expect(TotpGateCoordinator).toBe(constructors.TotpGateCoordinator);
  });
});
