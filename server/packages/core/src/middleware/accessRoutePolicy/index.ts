export type AccessRoutePath = `/${string}`;

export type AccessRouteClassification =
  | "browserAccessProtectedAnonymous"
  | "machineAccessBypass"
  | "blockedLegacyUnauthenticated"
  | "websocketAccessBypass";

export type AccessDeploymentDecision = "otp" | "bypass" | "block";

function freezeRoutePaths<const T extends readonly AccessRoutePath[]>(
  paths: T
): Readonly<T> {
  return Object.freeze(paths);
}

/** Browser routes that skip Hodor user authentication but remain behind Access. */
export const browserAccessProtectedAnonymous = freezeRoutePaths([
  "/admin/system/auth/login",
  "/admin/system/auth/oauth/login/url",
  "/admin/system/auth/oauth/login/callback",
  "/admin/system/auth/sso/login/url",
  "/admin/system/auth/sso/login/callback",
  "/admin/i18n/translation/listAll",
] as const);

/** Machine routes that bypass Access and authenticate with application credentials. */
export const machineAccessBypass = freezeRoutePaths([
  "/admin/mobile/async-task/callback",
  "/admin/mobile/device/report/presence",
  "/admin/mobile/device/report/info",
  "/admin/mobile/device/report/event",
  "/admin/mobile/device/report/deployment",
  "/admin/mobile/device/report/network-routing",
  "/admin/mobile/client-release/upload/prepare",
  "/admin/mobile/client-release/upload/finalize",
] as const);

/**
 * Legacy routes that currently skip Hodor auth but lack a safe machine
 * credential. Access deployment must stop instead of creating a bypass policy.
 */
export const blockedLegacyUnauthenticated = freezeRoutePaths([
  "/admin/mobile/device-app/callback",
] as const);

/** WebSocket routes have a separate Access policy and are not HTTP auth exemptions. */
export const websocketAccessBypass = freezeRoutePaths([
  "/admin/mobile/device-ops/ws",
] as const);

/**
 * Match only the declared route itself or a real child path. Similar prefixes such
 * as `/login-extra` and values containing query strings are deliberately rejected.
 */
export function matchesAccessRoute(
  requestPath: string,
  policyPath: AccessRoutePath
): boolean {
  return requestPath === policyPath || requestPath.startsWith(`${policyPath}/`);
}

export function matchesAnyAccessRoute(
  requestPath: string,
  policyPaths: readonly AccessRoutePath[]
): boolean {
  return policyPaths.some((policyPath) =>
    matchesAccessRoute(requestPath, policyPath)
  );
}

export function classifyAccessRoute(
  requestPath: string
): AccessRouteClassification | undefined {
  if (matchesAnyAccessRoute(requestPath, browserAccessProtectedAnonymous)) {
    return "browserAccessProtectedAnonymous";
  }
  if (matchesAnyAccessRoute(requestPath, machineAccessBypass)) {
    return "machineAccessBypass";
  }
  if (matchesAnyAccessRoute(requestPath, blockedLegacyUnauthenticated)) {
    return "blockedLegacyUnauthenticated";
  }
  if (matchesAnyAccessRoute(requestPath, websocketAccessBypass)) {
    return "websocketAccessBypass";
  }
  return undefined;
}

/** Access deployment decision consumed by policy verification tooling. */
export function getAccessDeploymentDecision(
  requestPath: string
): AccessDeploymentDecision | undefined {
  const classification = classifyAccessRoute(requestPath);
  if (classification === "browserAccessProtectedAnonymous") {
    return "otp";
  }
  if (
    classification === "machineAccessBypass" ||
    classification === "websocketAccessBypass"
  ) {
    return "bypass";
  }
  if (classification === "blockedLegacyUnauthenticated") {
    return "block";
  }
  return undefined;
}

/** Hodor user authentication exemptions used by the HTTP encapsulation layer. */
export function isHodorAuthBypassed(requestPath: string): boolean {
  const classification = classifyAccessRoute(requestPath);
  return (
    classification === "browserAccessProtectedAnonymous" ||
    classification === "machineAccessBypass" ||
    classification === "blockedLegacyUnauthenticated"
  );
}
