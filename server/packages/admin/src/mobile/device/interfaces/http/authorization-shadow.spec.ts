import { describe, expect, it, vi } from "vitest";

import {
  createDeviceDetailAuthorizationShadowDecision,
  scheduleDeviceDetailAuthorizationShadow,
} from "./authorization-shadow.js";

const input = {
  deviceId: 42,
  isEnabled: true,
  requestId: "request-42",
  actor: { userId: 7, roleIds: [3, 1], isSuperAdmin: false },
} as const;

describe("device detail authorization shadow", () => {
  it("builds a minimal server-owned MobileDevice decision", () => {
    expect(createDeviceDetailAuthorizationShadowDecision(input)).toEqual({
      requestId: "request-42",
      rbacAllowed: true,
      actor: { userId: 7, roleIds: [3, 1], isSuperAdmin: false },
      decision: {
        action: "read",
        resource: {
          type: "MobileDevice",
          id: "42",
          attributes: { classification: 1, status: "active" },
        },
        context: {},
      },
    });
    expect(
      createDeviceDetailAuthorizationShadowDecision({
        ...input,
        isEnabled: false,
      }).decision.resource.attributes
    ).toEqual({ classification: 1, status: "blocked" });
  });

  it("registers the handled observation with Worker waitUntil", async () => {
    const observe = vi.fn().mockResolvedValue(undefined);
    let backgroundTask: Promise<unknown> | undefined;
    const task = scheduleDeviceDetailAuthorizationShadow(input, {
      observe,
      waitUntil: (promise) => {
        backgroundTask = promise;
      },
    });
    expect(backgroundTask).toBe(task);
    await task;
    expect(observe).toHaveBeenCalledOnce();
  });

  it("absorbs observer and unavailable Worker scheduler failures", async () => {
    const observe = vi.fn().mockRejectedValue(new Error("sensitive failure"));
    await expect(
      scheduleDeviceDetailAuthorizationShadow(input, {
        observe,
        waitUntil: () => {
          throw new Error("Node runtime has no execution context");
        },
      })
    ).resolves.toBeUndefined();
    expect(observe).toHaveBeenCalledOnce();
  });
});
