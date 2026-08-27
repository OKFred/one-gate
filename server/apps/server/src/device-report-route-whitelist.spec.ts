import { describe, expect, it } from "vitest";

import { machineAccessBypass } from "../../../packages/core/src/middleware/accessRoutePolicy";

describe("mobile device report route whitelist", () => {
  it("exposes all device-token report entry points before user authentication", () => {
    expect(machineAccessBypass).toContain(
      "/admin/mobile/device/report/presence"
    );
    expect(machineAccessBypass).toContain("/admin/mobile/device/report/info");
    expect(machineAccessBypass).toContain("/admin/mobile/device/report/event");
    expect(machineAccessBypass).toContain(
      "/admin/mobile/device/report/deployment"
    );
    expect(machineAccessBypass).toContain(
      "/admin/mobile/device/report/network-routing"
    );
  });
});
