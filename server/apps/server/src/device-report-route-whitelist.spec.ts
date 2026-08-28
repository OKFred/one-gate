import { describe, expect, it } from "vitest";

import { machineCredentialBypass } from "../../../packages/core/src/middleware/authenticationRoutePolicy";

describe("mobile device report route whitelist", () => {
  it("exposes all device-token report entry points before user authentication", () => {
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/device/report/presence"
    );
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/device/report/info"
    );
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/device/report/event"
    );
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/device/report/deployment"
    );
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/device/report/network-routing"
    );
  });
});
