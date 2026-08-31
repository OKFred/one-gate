import { describe, expect, it } from "vitest";

import {
  machineCredentialBypass,
  primaryAuthAnonymous,
} from "../../../packages/core/src/middleware/authenticationRoutePolicy";

describe("external authentication route policy", () => {
  it("only exposes password and standard SSO as primary login methods", () => {
    expect(primaryAuthAnonymous).toContain("/admin/system/auth/login");
    expect(primaryAuthAnonymous).toContain("/admin/system/auth/sso/login/url");
    expect(primaryAuthAnonymous).toContain(
      "/admin/system/auth/sso/login/callback"
    );
    expect(primaryAuthAnonymous).not.toContain(
      "/admin/system/auth/oauth/login/url"
    );
    expect(primaryAuthAnonymous).not.toContain(
      "/admin/system/auth/oauth/login/callback"
    );
    expect(primaryAuthAnonymous).not.toContain("/admin/system/auth/wechat");
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/client-release/upload/prepare"
    );
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/client-release/upload/finalize"
    );
  });
});
