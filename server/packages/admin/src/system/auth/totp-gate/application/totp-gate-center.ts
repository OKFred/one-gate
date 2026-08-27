import {
  TOTP_GATE_ATTEMPT_WINDOW_MS,
  TOTP_GATE_CLIENT_ATTEMPT_LIMIT,
  TOTP_GATE_ERROR_CODES,
  TOTP_GATE_GLOBAL_ATTEMPT_LIMIT,
  TOTP_GATE_SESSION_TTL_MS,
  TOTP_GATE_SESSION_VERSION,
  constantTimeEqual,
  normalizeTotpCode,
  type TotpGateSessionClaims,
} from "../domain/totp-gate.js";
import { TotpGateApplicationError } from "./error.js";
import type {
  TotpAttemptCoordinator,
  TotpGateAuditLogger,
  TotpGateClock,
  TotpGateCryptography,
  TotpGateSecretProvider,
} from "./ports.js";

export interface TotpGatePrimarySession {
  readonly userId: number;
  readonly token: string;
  readonly expiresAtMs: number;
}

export interface TotpGateStatus {
  readonly verified: boolean;
  readonly expiresAtUtc: string | null;
}

export interface TotpGateVerification extends TotpGateStatus {
  readonly cookieValue: string;
  readonly maxAgeSeconds: number;
}

export interface TotpGateCenterDependencies {
  readonly clock: TotpGateClock;
  readonly secrets: TotpGateSecretProvider;
  readonly cryptography: TotpGateCryptography;
  readonly coordinator: TotpAttemptCoordinator;
  readonly audit: TotpGateAuditLogger;
}

export class TotpGateCenter {
  constructor(private readonly dependencies: TotpGateCenterDependencies) {}

  private requireSecret(): string {
    const secret = this.dependencies.secrets.read()?.trim();
    if (!secret) {
      throw new TotpGateApplicationError(TOTP_GATE_ERROR_CODES.UNAVAILABLE);
    }
    return secret;
  }

  async getStatus(input: {
    readonly primary: TotpGatePrimarySession;
    readonly cookieValue: string | undefined;
    readonly requestId: string;
  }): Promise<TotpGateStatus> {
    const secret = this.requireSecret();
    if (!input.cookieValue) {
      this.dependencies.audit.write({
        requestId: input.requestId,
        userId: input.primary.userId,
        outcome: "missing_session",
      });
      return { verified: false, expiresAtUtc: null };
    }

    try {
      const [claims, tokenDigest, fingerprint] = await Promise.all([
        this.dependencies.cryptography.verifySession(secret, input.cookieValue),
        this.dependencies.cryptography.digestToken(secret, input.primary.token),
        this.dependencies.cryptography.fingerprint(secret),
      ]);
      const nowMs = this.dependencies.clock.now();
      const verified = Boolean(
        claims &&
        claims.userId === input.primary.userId &&
        claims.expiresAtMs > nowMs &&
        claims.expiresAtMs <= input.primary.expiresAtMs &&
        constantTimeEqual(claims.tokenDigest, tokenDigest) &&
        constantTimeEqual(claims.secretFingerprint, fingerprint)
      );
      this.dependencies.audit.write({
        requestId: input.requestId,
        userId: input.primary.userId,
        outcome: verified ? "verified_session" : "invalid_session",
      });
      return {
        verified,
        expiresAtUtc:
          verified && claims
            ? new Date(claims.expiresAtMs).toISOString()
            : null,
      };
    } catch {
      this.dependencies.audit.write({
        requestId: input.requestId,
        userId: input.primary.userId,
        outcome: "unavailable",
      });
      throw new TotpGateApplicationError(TOTP_GATE_ERROR_CODES.UNAVAILABLE);
    }
  }

  async verify(input: {
    readonly primary: TotpGatePrimarySession;
    readonly clientIdentity: string;
    readonly code: string;
    readonly requestId: string;
  }): Promise<TotpGateVerification> {
    const secret = this.requireSecret();
    const nowMs = this.dependencies.clock.now();
    if (input.primary.expiresAtMs <= nowMs) {
      throw new TotpGateApplicationError(TOTP_GATE_ERROR_CODES.REQUIRED);
    }

    try {
      const [fingerprint, candidates, clientDigest, tokenDigest] =
        await Promise.all([
          this.dependencies.cryptography.fingerprint(secret),
          this.dependencies.cryptography.createCandidates(secret, nowMs),
          this.dependencies.cryptography.digestClient(
            secret,
            `${input.primary.userId}:${input.clientIdentity}`
          ),
          this.dependencies.cryptography.digestToken(
            secret,
            input.primary.token
          ),
        ]);
      const attempt = await this.dependencies.coordinator.verifyAttempt({
        gateId: fingerprint,
        clientKey: clientDigest,
        nowMs,
        submittedCode: normalizeTotpCode(input.code),
        candidates,
        clientLimit: TOTP_GATE_CLIENT_ATTEMPT_LIMIT,
        globalLimit: TOTP_GATE_GLOBAL_ATTEMPT_LIMIT,
        windowMs: TOTP_GATE_ATTEMPT_WINDOW_MS,
      });
      this.dependencies.audit.write({
        requestId: input.requestId,
        userId: input.primary.userId,
        outcome: attempt.outcome,
      });

      if (
        attempt.outcome === "client_rate_limited" ||
        attempt.outcome === "global_rate_limited"
      ) {
        throw new TotpGateApplicationError(TOTP_GATE_ERROR_CODES.RATE_LIMITED);
      }
      if (attempt.outcome !== "accepted") {
        throw new TotpGateApplicationError(TOTP_GATE_ERROR_CODES.CODE_INVALID);
      }

      const expiresAtMs = Math.min(
        nowMs + TOTP_GATE_SESSION_TTL_MS,
        input.primary.expiresAtMs
      );
      const claims: TotpGateSessionClaims = {
        version: TOTP_GATE_SESSION_VERSION,
        userId: input.primary.userId,
        tokenDigest,
        secretFingerprint: fingerprint,
        issuedAtMs: nowMs,
        expiresAtMs,
      };
      return {
        verified: true,
        expiresAtUtc: new Date(expiresAtMs).toISOString(),
        cookieValue: await this.dependencies.cryptography.signSession(
          secret,
          claims
        ),
        maxAgeSeconds: Math.max(1, Math.floor((expiresAtMs - nowMs) / 1000)),
      };
    } catch (error) {
      if (error instanceof TotpGateApplicationError) throw error;
      this.dependencies.audit.write({
        requestId: input.requestId,
        userId: input.primary.userId,
        outcome: "unavailable",
      });
      throw new TotpGateApplicationError(TOTP_GATE_ERROR_CODES.UNAVAILABLE);
    }
  }
}
