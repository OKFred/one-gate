import { describe, expect, it } from "vitest";

import {
  classifyAuthenticationRoute,
  isHodorAuthBypassed,
  machineCredentialBypass,
  matchesAuthenticationRoute,
  primaryAuthAnonymous,
  totpGateAnonymousControl,
  totpGateAuthenticatedControl,
  websocketCredentialBypass,
} from "./index";

describe("authentication route policy", () => {
  it("keeps the primary-auth and gate-control routes explicit", () => {
    expect(primaryAuthAnonymous).toContain("/admin/system/auth/login");
    expect(primaryAuthAnonymous).toContain(
      "/admin/system/auth/sso/login/callback"
    );
    expect(totpGateAuthenticatedControl).toEqual([
      "/admin/system/auth/gate/status",
      "/admin/system/auth/gate/verify",
    ]);
    expect(totpGateAnonymousControl).toEqual([
      "/admin/system/auth/gate/logout",
    ]);
    expect(Object.isFrozen(primaryAuthAnonymous)).toBe(true);
    expect(Object.isFrozen(totpGateAuthenticatedControl)).toBe(true);
  });

  it("matches only exact routes and real child paths", () => {
    const login = "/admin/system/auth/login";
    expect(matchesAuthenticationRoute(login, login)).toBe(true);
    expect(matchesAuthenticationRoute(`${login}/continue`, login)).toBe(true);
    expect(matchesAuthenticationRoute(`${login}-extra`, login)).toBe(false);
    expect(matchesAuthenticationRoute(`${login}?next=/admin`, login)).toBe(
      false
    );
  });

  it("keeps machine and WebSocket credential routes separate", () => {
    expect(machineCredentialBypass).toContain(
      "/admin/mobile/device/report/presence"
    );
    expect(websocketCredentialBypass).toEqual(["/admin/mobile/device-ops/ws"]);
    expect(
      classifyAuthenticationRoute("/admin/mobile/device-ops/ws/01HXYZSESSION")
    ).toBe("websocketCredentialBypass");
  });

  it("only bypasses Hodor authentication where the route owns another credential", () => {
    expect(isHodorAuthBypassed("/admin/system/auth/login")).toBe(true);
    expect(isHodorAuthBypassed("/admin/system/auth/gate/logout")).toBe(true);
    expect(isHodorAuthBypassed("/admin/system/auth/gate/status")).toBe(false);
    expect(isHodorAuthBypassed("/admin/system/menu/list")).toBe(false);
    expect(
      isHodorAuthBypassed("/admin/mobile/device/report/presence-extra")
    ).toBe(false);
  });
});
