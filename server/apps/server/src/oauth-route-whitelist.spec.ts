import { describe, expect, it } from "vitest";

import {
  machineCredentialBypass,
  primaryAuthAnonymous,
} from "../../../packages/core/src/middleware/authenticationRoutePolicy";

describe("public authentication route whitelist", () => {
  it("exposes only the unified OAuth login entry points", () => {
    expect(primaryAuthAnonymous).toContain(
      "/admin/system/auth/oauth/login/url"
    );
    expect(primaryAuthAnonymous).toContain(
      "/admin/system/auth/oauth/login/callback"
    );
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/client-release/upload/prepare"
    );
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/client-release/upload/finalize"
    );
    expect(primaryAuthAnonymous).not.toContain("/admin/system/auth/github/url");
    expect(primaryAuthAnonymous).not.toContain(
      "/admin/system/auth/github/login"
    );
    expect(primaryAuthAnonymous).not.toContain(
      "/admin/system/auth/oauth/account/url"
    );
    expect(primaryAuthAnonymous).not.toContain(
      "/admin/system/auth/oauth/account/callback"
    );
  });
});
