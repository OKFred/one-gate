import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { TotpAttemptInput } from "@hodor/admin/system/auth/totp-gate/index.js";

function attempt(gateId: string, code = "123456"): TotpAttemptInput {
  return {
    gateId,
    clientKey: "client-key",
    nowMs: 90_000,
    submittedCode: code,
    candidates: [{ step: 3, code: "123456" }],
    clientLimit: 5,
    globalLimit: 50,
    windowMs: 60_000,
  };
}

async function verify(input: TotpAttemptInput): Promise<string> {
  const body: unknown = await env.TOTP_GATE_COORDINATOR.getByName(
    input.gateId
  ).verifyAttempt(input);
  if (!body || typeof body !== "object" || !("outcome" in body)) {
    throw new Error("Missing coordinator outcome");
  }
  return String(body.outcome);
}

describe("TotpGateCoordinator Durable Object", () => {
  it("accepts a time step only once under concurrent requests", async () => {
    const input = attempt(`concurrency-${crypto.randomUUID()}`);
    const outcomes = await Promise.all([verify(input), verify(input)]);
    expect(outcomes.sort()).toEqual(["accepted", "replayed"]);
  });

  it("enforces the per-client failure limit inside one window", async () => {
    const gateId = `rate-${crypto.randomUUID()}`;
    const outcomes: string[] = [];
    for (let index = 0; index < 6; index += 1) {
      outcomes.push(await verify(attempt(gateId, "999999")));
    }
    expect(outcomes.slice(0, 5)).toEqual(
      Array.from({ length: 5 }, () => "invalid")
    );
    expect(outcomes[5]).toBe("client_rate_limited");
  });
});
