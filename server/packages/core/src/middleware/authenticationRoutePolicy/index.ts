export type AuthenticationRoutePath = `/${string}`;

export type AuthenticationRouteClassification =
  | "primaryAuthAnonymous"
  | "totpGateAuthenticatedControl"
  | "totpGateAnonymousControl"
  | "machineCredentialBypass"
  | "websocketCredentialBypass";

function freezeRoutePaths<const T extends readonly AuthenticationRoutePath[]>(
  paths: T
): Readonly<T> {
  return Object.freeze(paths);
}

/** Browser routes needed to establish the first-factor Hodor session. */
export const primaryAuthAnonymous = freezeRoutePaths([
  "/admin/system/auth/login",
  "/admin/system/auth/oauth/login/url",
  "/admin/system/auth/oauth/login/callback",
  "/admin/system/auth/sso/login/url",
  "/admin/system/auth/sso/login/callback",
  "/admin/i18n/translation/listAll",
] as const);

/** TOTP control routes own their authentication and deliberately bypass the gate middleware. */
export const totpGateAuthenticatedControl = freezeRoutePaths([
  "/admin/system/auth/gate/status",
  "/admin/system/auth/gate/verify",
] as const);

/** Logout must be able to expire the gate cookie even after the Hodor token expires. */
export const totpGateAnonymousControl = freezeRoutePaths([
  "/admin/system/auth/gate/logout",
] as const);

/** Machine routes keep their existing application credential checks. */
export const machineCredentialBypass = freezeRoutePaths([
  "/admin/mobile/async-task/callback",
  "/admin/mobile/device-app/callback",
  "/admin/mobile/device/report/presence",
  "/admin/mobile/device/report/info",
  "/admin/mobile/device/report/event",
  "/admin/mobile/device/report/deployment",
  "/admin/mobile/device/report/network-routing",
  "/admin/mobile/client-release/upload/prepare",
  "/admin/mobile/client-release/upload/finalize",
] as const);

/** WebSocket sessions authenticate through their dedicated ticket or device credential. */
export const websocketCredentialBypass = freezeRoutePaths([
  "/admin/mobile/device-ops/ws",
] as const);

export function matchesAuthenticationRoute(
  requestPath: string,
  policyPath: AuthenticationRoutePath
): boolean {
  return requestPath === policyPath || requestPath.startsWith(`${policyPath}/`);
}

export function matchesAnyAuthenticationRoute(
  requestPath: string,
  policyPaths: readonly AuthenticationRoutePath[]
): boolean {
  return policyPaths.some((policyPath) =>
    matchesAuthenticationRoute(requestPath, policyPath)
  );
}

export function classifyAuthenticationRoute(
  requestPath: string
): AuthenticationRouteClassification | undefined {
  if (matchesAnyAuthenticationRoute(requestPath, primaryAuthAnonymous)) {
    return "primaryAuthAnonymous";
  }
  if (
    matchesAnyAuthenticationRoute(requestPath, totpGateAuthenticatedControl)
  ) {
    return "totpGateAuthenticatedControl";
  }
  if (matchesAnyAuthenticationRoute(requestPath, totpGateAnonymousControl)) {
    return "totpGateAnonymousControl";
  }
  if (matchesAnyAuthenticationRoute(requestPath, machineCredentialBypass)) {
    return "machineCredentialBypass";
  }
  if (matchesAnyAuthenticationRoute(requestPath, websocketCredentialBypass)) {
    return "websocketCredentialBypass";
  }
  return undefined;
}

/** Hodor user-auth exemptions consumed by the encapsulation layer. */
export function isHodorAuthBypassed(requestPath: string): boolean {
  const classification = classifyAuthenticationRoute(requestPath);
  return (
    classification === "primaryAuthAnonymous" ||
    classification === "totpGateAnonymousControl" ||
    classification === "machineCredentialBypass"
  );
}
