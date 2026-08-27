import { describe, expect, it } from "vitest";

import { machineAccessBypass } from "../../../packages/core/src/middleware/accessRoutePolicy";

describe("mobile client release route whitelist", () => {
  it("exposes only the machine-token upload entry points", () => {
    expect(machineAccessBypass).toContain(
      "/admin/mobile/client-release/upload/prepare"
    );
    expect(machineAccessBypass).toContain(
      "/admin/mobile/client-release/upload/finalize"
    );
    expect(machineAccessBypass).not.toContain(
      "/admin/mobile/client-release/list"
    );
    expect(machineAccessBypass).not.toContain(
      "/admin/mobile/client-release/revoke"
    );
  });
});
