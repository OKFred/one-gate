import type {
  TotpAttemptCoordinator,
  TotpAttemptInput,
  TotpAttemptResult,
} from "../application/ports.js";
import { findMatchingTotpStep } from "../domain/totp-gate.js";

interface GateState {
  readonly attemptCounts: Map<string, number>;
  readonly consumedSteps: Map<number, number>;
}

export class InMemoryTotpAttemptCoordinator implements TotpAttemptCoordinator {
  private readonly gates = new Map<string, GateState>();

  async verifyAttempt(input: TotpAttemptInput): Promise<TotpAttemptResult> {
    const gate = this.gates.get(input.gateId) ?? {
      attemptCounts: new Map<string, number>(),
      consumedSteps: new Map<number, number>(),
    };
    this.gates.set(input.gateId, gate);

    const bucket = Math.floor(input.nowMs / input.windowMs);
    for (const key of gate.attemptCounts.keys()) {
      const storedBucket = Number(key.slice(key.lastIndexOf(":") + 1));
      if (storedBucket < bucket - 1) gate.attemptCounts.delete(key);
    }
    for (const [step, consumedAtMs] of gate.consumedSteps) {
      if (consumedAtMs < input.nowMs - input.windowMs * 3) {
        gate.consumedSteps.delete(step);
      }
    }

    const clientBucketKey = `client:${input.clientKey}:${bucket}`;
    const globalBucketKey = `global:${bucket}`;
    const clientCount = gate.attemptCounts.get(clientBucketKey) ?? 0;
    const globalCount = gate.attemptCounts.get(globalBucketKey) ?? 0;
    if (clientCount >= input.clientLimit) {
      return { outcome: "client_rate_limited" };
    }
    if (globalCount >= input.globalLimit) {
      return { outcome: "global_rate_limited" };
    }

    const matchedStep = findMatchingTotpStep(
      input.submittedCode,
      input.candidates
    );
    if (matchedStep === undefined || gate.consumedSteps.has(matchedStep)) {
      gate.attemptCounts.set(clientBucketKey, clientCount + 1);
      gate.attemptCounts.set(globalBucketKey, globalCount + 1);
      return { outcome: matchedStep === undefined ? "invalid" : "replayed" };
    }
    gate.consumedSteps.set(matchedStep, input.nowMs);
    return { outcome: "accepted", matchedStep };
  }
}
