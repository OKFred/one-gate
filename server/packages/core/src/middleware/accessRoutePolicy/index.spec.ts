import { describe, expect, it } from "vitest";
import {
  blockedLegacyUnauthenticated,
  browserAccessProtectedAnonymous,
  classifyAccessRoute,
  getAccessDeploymentDecision,
  isHodorAuthBypassed,
  machineAccessBypass,
  matchesAccessRoute,
  websocketAccessBypass,
} from "./index";

const expectedBrowserRoutes = [
  "/admin/system/auth/login",
  "/admin/system/auth/oauth/login/url",
  "/admin/system/auth/oauth/login/callback",
  "/admin/system/auth/sso/login/url",
  "/admin/system/auth/sso/login/callback",
  "/admin/i18n/translation/listAll",
] as const;

const expectedMachineRoutes = [
  "/admin/mobile/async-task/callback",
  "/admin/mobile/device/report/presence",
  "/admin/mobile/device/report/info",
  "/admin/mobile/device/report/event",
  "/admin/mobile/device/report/deployment",
  "/admin/mobile/device/report/network-routing",
  "/admin/mobile/client-release/upload/prepare",
  "/admin/mobile/client-release/upload/finalize",
] as const;

describe("access route policy", () => {
  it("keeps each policy category immutable and complete", () => {
    expect(browserAccessProtectedAnonymous).toEqual(expectedBrowserRoutes);
    expect(machineAccessBypass).toEqual(expectedMachineRoutes);
    expect(blockedLegacyUnauthenticated).toEqual([
      "/admin/mobile/device-app/callback",
    ]);
    expect(websocketAccessBypass).toEqual(["/admin/mobile/device-ops/ws"]);

    expect(Object.isFrozen(browserAccessProtectedAnonymous)).toBe(true);
    expect(Object.isFrozen(machineAccessBypass)).toBe(true);
    expect(Object.isFrozen(blockedLegacyUnauthenticated)).toBe(true);
    expect(Object.isFrozen(websocketAccessBypass)).toBe(true);
  });

  it("matches only exact routes and their real child paths", () => {
    const loginPath = "/admin/system/auth/login";

    expect(matchesAccessRoute(loginPath, loginPath)).toBe(true);
    expect(matchesAccessRoute(`${loginPath}/continue`, loginPath)).toBe(true);
    expect(matchesAccessRoute(`${loginPath}-extra`, loginPath)).toBe(false);
    expect(matchesAccessRoute(`${loginPath}?next=/admin`, loginPath)).toBe(
      false
    );
    expect(matchesAccessRoute(`/prefix${loginPath}`, loginPath)).toBe(false);
  });

  it("classifies every browser and machine route", () => {
    for (const route of expectedBrowserRoutes) {
      expect(classifyAccessRoute(route)).toBe(
        "browserAccessProtectedAnonymous"
      );
      expect(isHodorAuthBypassed(route)).toBe(true);
    }

    for (const route of expectedMachineRoutes) {
      expect(classifyAccessRoute(route)).toBe("machineAccessBypass");
      expect(isHodorAuthBypassed(route)).toBe(true);
    }
  });

  it("keeps WebSocket policy separate from Hodor HTTP auth exemptions", () => {
    const websocketSessionPath = "/admin/mobile/device-ops/ws/01HXYZSESSION";

    expect(classifyAccessRoute(websocketSessionPath)).toBe(
      "websocketAccessBypass"
    );
    expect(isHodorAuthBypassed(websocketSessionPath)).toBe(false);
  });

  it("blocks the unauthenticated legacy callback from Access bypass deployment", () => {
    const legacyCallback = "/admin/mobile/device-app/callback";

    expect(classifyAccessRoute(legacyCallback)).toBe(
      "blockedLegacyUnauthenticated"
    );
    expect(isHodorAuthBypassed(legacyCallback)).toBe(true);
    expect(getAccessDeploymentDecision(legacyCallback)).toBe("block");
    expect(machineAccessBypass).not.toContain(legacyCallback);
  });

  it("exports explicit deployment decisions for every deployable category", () => {
    expect(
      getAccessDeploymentDecision("/admin/system/auth/sso/login/url")
    ).toBe("otp");
    expect(
      getAccessDeploymentDecision("/admin/mobile/async-task/callback")
    ).toBe("bypass");
    expect(
      getAccessDeploymentDecision("/admin/mobile/device-ops/ws/01HXYZSESSION")
    ).toBe("bypass");
    expect(getAccessDeploymentDecision("/admin/system/auth/profile")).toBe(
      undefined
    );
  });

  it("does not exempt unclassified or similar-prefix routes", () => {
    expect(classifyAccessRoute("/admin/system/auth/profile")).toBeUndefined();
    expect(
      isHodorAuthBypassed("/admin/mobile/device/report/presence-extra")
    ).toBe(false);
  });
});
