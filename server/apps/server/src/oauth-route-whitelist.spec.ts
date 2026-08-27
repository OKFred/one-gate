import { describe, expect, it } from "vitest";

import {
  browserAccessProtectedAnonymous,
  machineAccessBypass,
} from "../../../packages/core/src/middleware/accessRoutePolicy";

describe("public authentication route whitelist", () => {
  it("exposes only the unified OAuth login entry points", () => {
    expect(browserAccessProtectedAnonymous).toContain(
      "/admin/system/auth/oauth/login/url"
    );
    expect(browserAccessProtectedAnonymous).toContain(
      "/admin/system/auth/oauth/login/callback"
    );
    expect(machineAccessBypass).toContain(
      "/admin/mobile/client-release/upload/prepare"
    );
    expect(machineAccessBypass).toContain(
      "/admin/mobile/client-release/upload/finalize"
    );
    expect(browserAccessProtectedAnonymous).not.toContain(
      "/admin/system/auth/github/url"
    );
    expect(browserAccessProtectedAnonymous).not.toContain(
      "/admin/system/auth/github/login"
    );
    expect(browserAccessProtectedAnonymous).not.toContain(
      "/admin/system/auth/oauth/account/url"
    );
    expect(browserAccessProtectedAnonymous).not.toContain(
      "/admin/system/auth/oauth/account/callback"
    );
  });
});
