export const TOTP_GATE_SESSION_VERSION = 1 as const;
export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_WINDOW_STEPS = 1;
export const TOTP_GATE_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const TOTP_GATE_CLIENT_ATTEMPT_LIMIT = 5;
export const TOTP_GATE_GLOBAL_ATTEMPT_LIMIT = 50;
export const TOTP_GATE_ATTEMPT_WINDOW_MS = 60_000;

export const TOTP_GATE_ERROR_CODES = {
  REQUIRED: "TOTP_GATE_REQUIRED",
  CODE_INVALID: "TOTP_CODE_INVALID",
  RATE_LIMITED: "TOTP_GATE_RATE_LIMITED",
  UNAVAILABLE: "TOTP_GATE_UNAVAILABLE",
} as const;

export type TotpGateErrorCode =
  (typeof TOTP_GATE_ERROR_CODES)[keyof typeof TOTP_GATE_ERROR_CODES];

export interface TotpCandidate {
  readonly step: number;
  readonly code: string;
}

export interface TotpGateSessionClaims {
  readonly version: typeof TOTP_GATE_SESSION_VERSION;
  readonly userId: number;
  readonly tokenDigest: string;
  readonly secretFingerprint: string;
  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
}

export function normalizeTotpCode(value: string): string {
  return /^\d{6}$/u.test(value) ? value : "";
}

export function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function findMatchingTotpStep(
  submittedCode: string,
  candidates: readonly TotpCandidate[]
): number | undefined {
  let matchedStep: number | undefined;
  for (const candidate of candidates) {
    const matches = constantTimeEqual(submittedCode, candidate.code);
    if (matches && matchedStep === undefined) matchedStep = candidate.step;
  }
  return matchedStep;
}

export function isTotpGateSessionClaims(
  value: unknown
): value is TotpGateSessionClaims {
  if (!value || typeof value !== "object") return false;
  const claims = value as Record<string, unknown>;
  return (
    claims.version === TOTP_GATE_SESSION_VERSION &&
    Number.isInteger(claims.userId) &&
    typeof claims.userId === "number" &&
    claims.userId > 0 &&
    typeof claims.tokenDigest === "string" &&
    claims.tokenDigest.length >= 32 &&
    typeof claims.secretFingerprint === "string" &&
    claims.secretFingerprint.length >= 8 &&
    typeof claims.issuedAtMs === "number" &&
    Number.isFinite(claims.issuedAtMs) &&
    typeof claims.expiresAtMs === "number" &&
    Number.isFinite(claims.expiresAtMs) &&
    claims.expiresAtMs > claims.issuedAtMs
  );
}
