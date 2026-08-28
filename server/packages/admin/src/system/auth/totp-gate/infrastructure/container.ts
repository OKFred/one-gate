import { getEnv } from "@hodor/core/utils/env.js";
import { TotpGateCenter } from "../application/totp-gate-center.js";
import type {
  TotpAttemptCoordinator,
  TotpGateAuditLogger,
} from "../application/ports.js";
import { WebCryptoTotpGateCryptography } from "./web-crypto.js";

const cryptography = new WebCryptoTotpGateCryptography();

const audit: TotpGateAuditLogger = {
  write(event): void {
    const level =
      event.outcome === "accepted" || event.outcome === "verified_session"
        ? "info"
        : event.outcome === "unavailable"
          ? "error"
          : "warn";
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      service: "hodor-server",
      event: "auth.totp_gate.authorization",
      requestId: event.requestId,
      userId: event.userId,
      authStage: "secondary",
      authProvider: "totp",
      authMethod: "totp",
      authOutcome: event.outcome,
    };
    const line = JSON.stringify(payload);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  },
};

export function createTotpGateCenter(
  coordinator: TotpAttemptCoordinator
): TotpGateCenter {
  return new TotpGateCenter({
    clock: { now: () => Date.now() },
    secrets: { read: () => getEnv("HODOR_TOTP_GATE_SECRET") },
    cryptography,
    coordinator,
    audit,
  });
}
