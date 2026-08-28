import type {
  TotpCandidate,
  TotpGateSessionClaims,
} from "../domain/totp-gate.js";

export interface TotpGateClock {
  now(): number;
}

export interface TotpGateSecretProvider {
  read(): string | undefined;
}

export interface TotpGateCryptography {
  fingerprint(secret: string): Promise<string>;
  createCandidates(
    secret: string,
    nowMs: number
  ): Promise<readonly TotpCandidate[]>;
  digestToken(secret: string, token: string): Promise<string>;
  digestClient(secret: string, clientIdentity: string): Promise<string>;
  signSession(secret: string, claims: TotpGateSessionClaims): Promise<string>;
  verifySession(
    secret: string,
    value: string
  ): Promise<TotpGateSessionClaims | undefined>;
}

export type TotpAttemptOutcome =
  | "accepted"
  | "invalid"
  | "replayed"
  | "client_rate_limited"
  | "global_rate_limited";

export interface TotpAttemptInput {
  readonly gateId: string;
  readonly clientKey: string;
  readonly nowMs: number;
  readonly submittedCode: string;
  readonly candidates: readonly TotpCandidate[];
  readonly clientLimit: number;
  readonly globalLimit: number;
  readonly windowMs: number;
}

export interface TotpAttemptResult {
  readonly outcome: TotpAttemptOutcome;
  readonly matchedStep?: number;
}

export interface TotpAttemptCoordinator {
  verifyAttempt(input: TotpAttemptInput): Promise<TotpAttemptResult>;
}

export type TotpGateAuditOutcome =
  | TotpAttemptOutcome
  | "verified_session"
  | "missing_session"
  | "invalid_session"
  | "unavailable";

export interface TotpGateAuditLogger {
  write(event: {
    readonly requestId: string;
    readonly userId: number;
    readonly outcome: TotpGateAuditOutcome;
  }): void;
}
