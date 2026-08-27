import { describe, expect, it } from "vitest";

import { machineCredentialBypass } from "../../../packages/core/src/middleware/authenticationRoutePolicy";

describe("mobile client release route whitelist", () => {
  it("exposes only the machine-token upload entry points", () => {
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/client-release/upload/prepare"
    );
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/client-release/upload/finalize"
    );
    expect(machineCredentialBypass).not.toContain(
      "/admin/mobile/client-release/list"
    );
    expect(machineCredentialBypass).not.toContain(
      "/admin/mobile/client-release/revoke"
    );
  });
});
