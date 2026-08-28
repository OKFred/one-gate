import { afterEach, describe, expect, it, vi } from "vitest";

import { getEnv, setEnv } from "@hodor/core/utils/env";

import { TotpGateApplicationError } from "./application/error";
import type { TotpGateAuditOutcome } from "./application/ports";
import { TotpGateCenter } from "./application/totp-gate-center";
import {
  TOTP_GATE_ERROR_CODES,
  findMatchingTotpStep,
  normalizeTotpCode,
} from "./domain/totp-gate";
import { InMemoryTotpAttemptCoordinator } from "./infrastructure/node-coordinator";
import { WebCryptoTotpGateCryptography } from "./infrastructure/web-crypto";
import { createTotpGateCenter } from "./infrastructure/container";
import { createTotpGateHttpApp } from "./interfaces/http/app";

const RFC_TEST_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
const RFC_TEST_TIME_MS = 59_000;
const originalSecret = getEnv("HODOR_TOTP_GATE_SECRET");
const originalNodeEnvironment = getEnv("NODE_ENV");

afterEach(() => {
  setEnv({
    HODOR_TOTP_GATE_SECRET: originalSecret,
    NODE_ENV: originalNodeEnvironment,
  });
  vi.restoreAllMocks();
});

function createFixture(secret: string | undefined = RFC_TEST_SECRET) {
  let nowMs = RFC_TEST_TIME_MS;
  const outcomes: TotpGateAuditOutcome[] = [];
  const cryptography = new WebCryptoTotpGateCryptography();
  const center = new TotpGateCenter({
    clock: { now: () => nowMs },
    secrets: { read: () => secret },
    cryptography,
    coordinator: new InMemoryTotpAttemptCoordinator(),
    audit: { write: (event) => outcomes.push(event.outcome) },
  });
  return {
    center,
    cryptography,
    outcomes,
    setNow(value: number) {
      nowMs = value;
    },
  };
}

const primary = {
  userId: 7,
  token: "hodor-primary-token",
  expiresAtMs: RFC_TEST_TIME_MS + 24 * 60 * 60 * 1000,
};

describe("TOTP gate", () => {
  it("matches the RFC 6238 SHA-1 vector after reducing it to six digits", async () => {
    const fixture = createFixture();
    const candidates = await fixture.cryptography.createCandidates(
      RFC_TEST_SECRET,
      RFC_TEST_TIME_MS
    );
    expect(candidates[0]).toEqual({ step: 1, code: "287082" });
  });

  it("never maps malformed input to a valid six-digit code", () => {
    expect(
      findMatchingTotpStep(normalizeTotpCode("not-a-code"), [
        { step: 1, code: "000000" },
      ])
    ).toBeUndefined();
  });

  it("binds a verified cookie to the user and exact primary token", async () => {
    const fixture = createFixture();
    const verification = await fixture.center.verify({
      primary,
      clientIdentity: "test-client",
      code: "287082",
      requestId: "request-1",
    });
    expect(verification.verified).toBe(true);
    await expect(
      fixture.center.getStatus({
        primary,
        cookieValue: verification.cookieValue,
        requestId: "request-2",
      })
    ).resolves.toMatchObject({ verified: true });
    await expect(
      fixture.center.getStatus({
        primary: { ...primary, token: "new-primary-token" },
        cookieValue: verification.cookieValue,
        requestId: "request-3",
      })
    ).resolves.toEqual({ verified: false, expiresAtUtc: null });
  });

  it("rejects replay of a previously consumed time step", async () => {
    const fixture = createFixture();
    await fixture.center.verify({
      primary,
      clientIdentity: "test-client",
      code: "287082",
      requestId: "request-1",
    });
    await expect(
      fixture.center.verify({
        primary,
        clientIdentity: "test-client",
        code: "287082",
        requestId: "request-2",
      })
    ).rejects.toMatchObject({ code: TOTP_GATE_ERROR_CODES.CODE_INVALID });
    expect(fixture.outcomes).toContain("replayed");
  });

  it("rate limits the sixth failed attempt for one client in a minute", async () => {
    const fixture = createFixture();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        fixture.center.verify({
          primary,
          clientIdentity: "test-client",
          code: "111111",
          requestId: `request-${attempt}`,
        })
      ).rejects.toMatchObject({ code: TOTP_GATE_ERROR_CODES.CODE_INVALID });
    }
    await expect(
      fixture.center.verify({
        primary,
        clientIdentity: "test-client",
        code: "111111",
        requestId: "request-6",
      })
    ).rejects.toMatchObject({ code: TOTP_GATE_ERROR_CODES.RATE_LIMITED });
  });

  it("rate limits the fifty-first failed attempt across different clients", async () => {
    const coordinator = new InMemoryTotpAttemptCoordinator();
    const baseAttempt = {
      gateId: "global-gate",
      nowMs: RFC_TEST_TIME_MS,
      submittedCode: "111111",
      candidates: [{ step: 1, code: "287082" }],
      clientLimit: 5,
      globalLimit: 50,
      windowMs: 60_000,
    } as const;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await expect(
        coordinator.verifyAttempt({
          ...baseAttempt,
          clientKey: `client-${attempt}`,
        })
      ).resolves.toEqual({ outcome: "invalid" });
    }
    await expect(
      coordinator.verifyAttempt({
        ...baseAttempt,
        clientKey: "client-50",
      })
    ).resolves.toEqual({ outcome: "global_rate_limited" });
  });

  it("expires the gate session no later than the primary token", async () => {
    const fixture = createFixture();
    const shortPrimary = { ...primary, expiresAtMs: RFC_TEST_TIME_MS + 60_000 };
    const verification = await fixture.center.verify({
      primary: shortPrimary,
      clientIdentity: "test-client",
      code: "287082",
      requestId: "request-1",
    });
    fixture.setNow(shortPrimary.expiresAtMs);
    await expect(
      fixture.center.getStatus({
        primary: shortPrimary,
        cookieValue: verification.cookieValue,
        requestId: "request-2",
      })
    ).resolves.toEqual({ verified: false, expiresAtUtc: null });
  });

  it("fails closed when the deployment secret is absent", async () => {
    const fixture = createFixture("");
    await expect(
      fixture.center.getStatus({
        primary,
        cookieValue: undefined,
        requestId: "request-1",
      })
    ).rejects.toBeInstanceOf(TotpGateApplicationError);
  });

  it("never writes the submitted code, token, client identity, or secret to audit logs", async () => {
    setEnv({ HODOR_TOTP_GATE_SECRET: RFC_TEST_SECRET });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const center = createTotpGateCenter(new InMemoryTotpAttemptCoordinator());
    const currentCodes = new Set(
      (
        await new WebCryptoTotpGateCryptography().createCandidates(
          RFC_TEST_SECRET,
          Date.now()
        )
      ).map((candidate) => candidate.code)
    );
    const invalidCode = ["000000", "111111", "222222"].find(
      (candidate) => !currentCodes.has(candidate)
    );
    if (!invalidCode)
      throw new Error("Unable to construct an invalid TOTP code");
    await expect(
      center.verify({
        primary: {
          userId: 7,
          token: "sensitive-token-sentinel",
          expiresAtMs: Date.now() + 60_000,
        },
        clientIdentity: "17700000000|sensitive-client-sentinel",
        code: invalidCode,
        requestId: "request-log-test",
      })
    ).rejects.toMatchObject({ code: TOTP_GATE_ERROR_CODES.CODE_INVALID });
    const output = warn.mock.calls.flat().join(" ");
    expect(output).toContain("request-log-test");
    for (const sensitive of [
      RFC_TEST_SECRET,
      "sensitive-token-sentinel",
      "sensitive-client-sentinel",
      "17700000000",
      invalidCode,
    ]) {
      expect(output).not.toContain(sensitive);
    }
  });

  it("clears the production gate with a host-only secure cookie even without a token", async () => {
    setEnv({ NODE_ENV: "production" });
    const fixture = createFixture();
    const app = createTotpGateHttpApp(() => fixture.center);
    const response = await app.request("/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "__Host-hodor-totp-gate="
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
    expect(response.headers.get("set-cookie")).toContain("Path=/");
    await expect(response.json()).resolves.toMatchObject({
      data: { verified: false, expiresAtUtc: null },
    });
  });
});
