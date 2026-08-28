import { DurableObject } from "cloudflare:workers";

import type {
  TotpAttemptCoordinator,
  TotpAttemptInput,
  TotpAttemptResult,
} from "@hodor/admin/system/auth/totp-gate/index.js";
import { findMatchingTotpStep } from "@hodor/admin/system/auth/totp-gate/index.js";

interface CountRow {
  readonly [column: string]: ArrayBuffer | string | number | null;
  readonly count: number;
}

interface ReplayRow {
  readonly [column: string]: ArrayBuffer | string | number | null;
  readonly step: number;
}

function isTotpAttemptInput(value: unknown): value is TotpAttemptInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.gateId === "string" &&
    typeof input.clientKey === "string" &&
    typeof input.nowMs === "number" &&
    typeof input.submittedCode === "string" &&
    Array.isArray(input.candidates) &&
    input.candidates.every(
      (candidate) =>
        candidate &&
        typeof candidate === "object" &&
        typeof candidate.step === "number" &&
        typeof candidate.code === "string"
    ) &&
    typeof input.clientLimit === "number" &&
    typeof input.globalLimit === "number" &&
    typeof input.windowMs === "number"
  );
}

function isTotpAttemptOutcome(
  value: unknown
): value is TotpAttemptResult["outcome"] {
  return (
    value === "accepted" ||
    value === "invalid" ||
    value === "replayed" ||
    value === "client_rate_limited" ||
    value === "global_rate_limited"
  );
}

/** SQLite-backed deployment-wide coordinator for rate limiting and TOTP replay prevention. */
export class TotpGateCoordinator extends DurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS attempt_counts (
        scope TEXT NOT NULL,
        bucket INTEGER NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (scope, bucket)
      )`
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS consumed_steps (
        step INTEGER PRIMARY KEY,
        consumed_at_ms INTEGER NOT NULL
      )`
    );
  }

  verifyAttempt(input: unknown): TotpAttemptResult {
    if (!isTotpAttemptInput(input)) throw new Error("Invalid TOTP attempt");
    return this.ctx.storage.transactionSync(() => this.consumeAttempt(input));
  }

  private consumeAttempt(input: TotpAttemptInput): TotpAttemptResult {
    const sql = this.ctx.storage.sql;
    const bucket = Math.floor(input.nowMs / input.windowMs);
    sql.exec("DELETE FROM attempt_counts WHERE bucket < ?", bucket - 1);
    sql.exec(
      "DELETE FROM consumed_steps WHERE consumed_at_ms < ?",
      input.nowMs - input.windowMs * 3
    );

    const clientScope = `client:${input.clientKey}`;
    const clientCount =
      sql
        .exec<CountRow>(
          "SELECT count FROM attempt_counts WHERE scope = ? AND bucket = ?",
          clientScope,
          bucket
        )
        .toArray()[0]?.count ?? 0;
    const globalCount =
      sql
        .exec<CountRow>(
          "SELECT count FROM attempt_counts WHERE scope = 'global' AND bucket = ?",
          bucket
        )
        .toArray()[0]?.count ?? 0;

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
    if (matchedStep === undefined) {
      this.recordFailure(clientScope, bucket);
      return { outcome: "invalid" };
    }
    const replay = sql
      .exec<ReplayRow>(
        "SELECT step FROM consumed_steps WHERE step = ?",
        matchedStep
      )
      .toArray()[0];
    if (replay) {
      this.recordFailure(clientScope, bucket);
      return { outcome: "replayed" };
    }
    sql.exec(
      "INSERT INTO consumed_steps (step, consumed_at_ms) VALUES (?, ?)",
      matchedStep,
      input.nowMs
    );
    return { outcome: "accepted", matchedStep };
  }

  private recordFailure(clientScope: string, bucket: number): void {
    const sql = this.ctx.storage.sql;
    for (const scope of [clientScope, "global"]) {
      sql.exec(
        `INSERT INTO attempt_counts (scope, bucket, count) VALUES (?, ?, 1)
         ON CONFLICT(scope, bucket) DO UPDATE SET count = count + 1`,
        scope,
        bucket
      );
    }
  }
}

export class CloudflareTotpAttemptCoordinator implements TotpAttemptCoordinator {
  constructor(
    private readonly namespace: DurableObjectNamespace<TotpGateCoordinator>
  ) {}

  async verifyAttempt(input: TotpAttemptInput): Promise<TotpAttemptResult> {
    const stub = this.namespace.getByName(input.gateId);
    const result: unknown = await stub.verifyAttempt(input);
    if (
      !result ||
      typeof result !== "object" ||
      !("outcome" in result) ||
      !isTotpAttemptOutcome(result.outcome)
    ) {
      throw new Error("TOTP coordinator returned an invalid response");
    }
    const matchedStep =
      "matchedStep" in result && typeof result.matchedStep === "number"
        ? result.matchedStep
        : undefined;
    return matchedStep === undefined
      ? { outcome: result.outcome }
      : { outcome: result.outcome, matchedStep };
  }
}
