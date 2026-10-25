import { sql, type SQL } from "drizzle-orm";
import { QUOTA_OBSERVATION_SOURCE_PREFIX } from "./quota-observation";
import { Validator, type Schema } from "@cfworker/json-schema";
import {
  UsageCostSchema,
  UsageCoverageSchema,
  UsageHistorySchema,
  UsageMetricSchema,
  syncStates,
  type UsageCoverage,
  type UsageHistory,
  type UsageSync,
} from "./model";
import {
  DAY_MS,
  INTERVAL_MS,
  LEASE_MS,
  record,
  type Lease,
  type SourceSnapshot,
  type UsageCursor,
  type UsageRepository,
} from "./types";

export interface UsageSqlPort {
  rows(query: SQL): Promise<Record<string, unknown>[]>;
  // Atomic transaction/batch. The final statement returns the fenced sync row.
  batch(queries: SQL[], write?: boolean): Promise<Record<string, unknown>[][]>;
}
const snapshotValidator = new Validator(
  JSON.parse(
    JSON.stringify({
      type: "object",
      properties: {
        source: { type: "string" },
        accountName: { type: ["string", "null"] },
        metrics: { type: "array", items: UsageMetricSchema },
        costs: { type: "array", items: UsageCostSchema },
        history: { type: "array", items: UsageHistorySchema },
        coverage: { type: "array", items: UsageCoverageSchema },
        collectedTimeUtc: { type: "number" },
      },
      required: [
        "source",
        "accountName",
        "metrics",
        "costs",
        "history",
        "coverage",
        "collectedTimeUtc",
      ],
      additionalProperties: false,
    })
  ) as Schema
);
const coverageValidator = new Validator(
  JSON.parse(
    JSON.stringify({ type: "array", items: UsageCoverageSchema })
  ) as Schema
);
const historyValidator = new Validator(
  JSON.parse(
    JSON.stringify({ type: "array", items: UsageHistorySchema })
  ) as Schema
);
function parse(value: unknown): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
function coverage(value: unknown): UsageCoverage[] {
  const parsed = parse(value);
  return coverageValidator.validate(parsed).valid
    ? (parsed as UsageCoverage[])
    : [];
}
function snapshots(value: unknown): SourceSnapshot | null {
  const parsed = parse(value);
  return snapshotValidator.validate(parsed).valid
    ? (parsed as SourceSnapshot)
    : null;
}
function cursor(value: unknown, now: number): UsageCursor {
  const parsed = parse(value);
  if (
    record(parsed) &&
    parsed.version === 1 &&
    Number.isSafeInteger(parsed.step) &&
    typeof parsed.startedTimeUtc === "number" &&
    Array.isArray(parsed.snapshots) &&
    parsed.snapshots.every((s) => snapshotValidator.validate(s).valid) &&
    coverageValidator.validate(parsed.coverage).valid
  ) {
    const result: UsageCursor = {
      version: 1,
      step: Number(parsed.step),
      startedTimeUtc: parsed.startedTimeUtc,
      snapshots: parsed.snapshots as SourceSnapshot[],
      coverage: parsed.coverage as UsageCoverage[],
    };
    const m = parsed.metadata;
    if (
      record(m) &&
      (m.plan === "free" || m.plan === "standard" || m.plan === "unknown") &&
      Array.isArray(m.datasetNames) &&
      m.datasetNames.every((s) => typeof s === "string") &&
      typeof m.subscriptionPage === "number"
    ) {
      result.metadata = {
        plan: m.plan,
        cycleStart: numeric(m.cycleStart),
        cycleEnd: numeric(m.cycleEnd),
        anchor: numeric(m.anchor),
        covered: typeof m.covered === "boolean" ? m.covered : null,
        subscriptionPage: m.subscriptionPage,
        datasetNames: m.datasetNames as string[],
        ...(m.r2Standard === true ? { r2Standard: true } : {}),
      };
      const a = m.analytics;
      if (
        record(a) &&
        numeric(a.nextStartUtc) !== null &&
        numeric(a.maxDurationMs) !== null &&
        numeric(a.retainedStartUtc) !== null &&
        numeric(a.pageLimit) !== null &&
        Array.isArray(a.fields) &&
        a.fields.every((f) => typeof f === "string") &&
        historyValidator.validate(a.history).valid
      )
        result.metadata.analytics = {
          nextStartUtc: Number(a.nextStartUtc),
          maxDurationMs: Number(a.maxDurationMs),
          retainedStartUtc: Number(a.retainedStartUtc),
          pageLimit: Number(a.pageLimit),
          fields: a.fields as string[],
          history: a.history as UsageHistory[],
        };
    }
    return result;
  }
  return {
    version: 1,
    step: 0,
    startedTimeUtc: now,
    snapshots: [],
    coverage: [],
  };
}
function numeric(value: unknown): number | null {
  if (value == null) return null;
  const result = Number(value);
  return Number.isSafeInteger(result) ? result : null;
}
function sync(row?: Record<string, unknown>): UsageSync {
  const state = syncStates.find((s) => s === row?.state) ?? "idle";
  return {
    state,
    jobId: typeof row?.job_id === "string" ? row.job_id : null,
    lastSuccessTimeUtc: numeric(row?.last_success_time_utc),
    nextRunTimeUtc: numeric(row?.next_run_time_utc),
    retryTimeUtc: numeric(row?.retry_time_utc),
  };
}
function guard(lease: Lease, now: number): SQL {
  return sql`account_id = ${lease.accountId} AND job_id = ${lease.jobId} AND owner = ${lease.owner} AND generation = ${lease.generation} AND lease_expires_time_utc > ${now} AND state = 'running'`;
}
export function createUsageRepository(port: UsageSqlPort): UsageRepository {
  return {
    async read(accountId, since) {
      // One statement is a consistent snapshot even with PostgreSQL READ COMMITTED.
      const combined = await port.rows(sql`
        SELECT 'snapshot' AS row_type,payload_json,NULL AS metric_id,CAST(NULL AS BIGINT) AS day_utc,NULL AS value,NULL AS kind,source,NULL AS state,NULL AS job_id,CAST(NULL AS BIGINT) AS last_success_time_utc,CAST(NULL AS BIGINT) AS next_run_time_utc,CAST(NULL AS BIGINT) AS retry_time_utc,NULL AS coverage_json FROM cloudflare_usage_snapshot WHERE account_id=${accountId}
        UNION ALL SELECT 'history',NULL,metric_id,day_utc,value,kind,source,NULL,NULL,NULL,NULL,NULL,NULL FROM (SELECT metric_id,day_utc,value,kind,source FROM cloudflare_usage_daily WHERE account_id=${accountId} AND day_utc>=${since} ORDER BY day_utc,metric_id LIMIT 12001) AS daily_window
        UNION ALL SELECT 'sync',NULL,NULL,NULL,NULL,NULL,NULL,state,job_id,last_success_time_utc,next_run_time_utc,retry_time_utc,coverage_json FROM cloudflare_usage_sync WHERE account_id=${accountId}
      `);
      const rows = combined.filter((r) => r.row_type === "snapshot");
      const daily = combined.filter((r) => r.row_type === "history");
      const states = combined.filter((r) => r.row_type === "sync");
      const history: UsageHistory[] = daily.slice(0, 12000).flatMap((r) =>
        typeof r.metric_id === "string" &&
        typeof r.source === "string" &&
        (r.kind === "daily_usage" || r.kind === "cumulative_snapshot") &&
        numeric(r.day_utc) !== null
          ? [
              {
                metricId: r.metric_id,
                dayUtc: Number(r.day_utc),
                value:
                  r.value == null || !Number.isFinite(Number(r.value))
                    ? null
                    : Number(r.value),
                kind: r.kind,
                source: r.source,
              },
            ]
          : []
      );
      return {
        snapshots: rows.flatMap((r) => {
          const s = snapshots(r.payload_json);
          return s ? [s] : [];
        }),
        history,
        coverage: [
          ...coverage(states[0]?.coverage_json),
          ...(daily.length > 12000
            ? [
                {
                  product: "History",
                  status: "partial",
                  reason: "history_response_limit;not_complete",
                },
              ]
            : []),
        ],
        sync: sync(states[0]),
      };
    },
    async request(accountId, now, jobId, manual) {
      await port.rows(
        sql`INSERT INTO cloudflare_usage_sync (account_id,job_id,state,last_success_time_utc,next_run_time_utc,retry_time_utc,requested_time_utc,owner,generation,lease_expires_time_utc,cursor_json,attempts,coverage_json) VALUES (${accountId},${jobId},'pending',NULL,${now},NULL,${now},NULL,0,0,NULL,0,'[]') ON CONFLICT(account_id) DO NOTHING RETURNING account_id`
      );
      // Active requests coalesce. Finished tasks respect the interval; manual clicks have a one-minute cooldown.
      const threshold = manual ? now - 60_000 : now - INTERVAL_MS;
      const changed = await port.rows(
        sql`UPDATE cloudflare_usage_sync SET job_id=${jobId}, state='pending', requested_time_utc=${now}, next_run_time_utc=${now}, retry_time_utc=NULL, cursor_json=NULL, attempts=0 WHERE account_id=${accountId} AND state IN ('idle','complete','partial','failed') AND requested_time_utc <= ${threshold} AND next_run_time_utc <= ${manual ? now + INTERVAL_MS : now} AND (retry_time_utc IS NULL OR retry_time_utc <= ${now}) RETURNING account_id`
      );
      const [row] = await port.rows(
        sql`SELECT * FROM cloudflare_usage_sync WHERE account_id=${accountId}`
      );
      return {
        accepted:
          changed.length > 0 ||
          row?.job_id === jobId ||
          row?.state === "pending" ||
          row?.state === "running",
        jobId: typeof row?.job_id === "string" ? row.job_id : null,
        state: sync(row).state,
        eligibleTimeUtc: Math.max(
          numeric(row?.requested_time_utc) === null
            ? now
            : Number(row.requested_time_utc) + 60_000,
          numeric(row?.retry_time_utc) ?? 0
        ),
      };
    },
    async claim(accountId, now, owner) {
      const [row] = await port.rows(
        sql`UPDATE cloudflare_usage_sync SET owner=${owner}, generation=generation+1, lease_expires_time_utc=${now + LEASE_MS}, state='running' WHERE account_id=${accountId} AND state IN ('pending','running') AND lease_expires_time_utc <= ${now} AND (retry_time_utc IS NULL OR retry_time_utc <= ${now}) RETURNING *`
      );
      if (!row || typeof row.job_id !== "string") return null;
      return {
        accountId,
        jobId: row.job_id,
        owner,
        generation: Number(row.generation),
        attempts: Number(row.attempts),
        cursor: cursor(row.cursor_json, now),
      };
    },
    async checkpoint(lease, next, now) {
      const result = await port.rows(
        sql`UPDATE cloudflare_usage_sync SET cursor_json=${JSON.stringify(next)}, owner=NULL, lease_expires_time_utc=0, state='pending' WHERE ${guard(lease, now)} RETURNING account_id`
      );
      return result.length === 1;
    },
    async publish(lease, next, now) {
      const exists = sql`EXISTS (SELECT 1 FROM cloudflare_usage_sync WHERE ${guard(lease, now)})`;
      const observationSourcePattern = `${QUOTA_OBSERVATION_SOURCE_PREFIX}%`;
      const queries: SQL[] = [];
      for (const source of next.snapshots) {
        queries.push(
          sql`INSERT INTO cloudflare_usage_snapshot(account_id,source,payload_json,collected_time_utc) SELECT ${lease.accountId},${source.source},${JSON.stringify(source)},${source.collectedTimeUtc} WHERE ${exists} ON CONFLICT(account_id,source) DO UPDATE SET payload_json=excluded.payload_json,collected_time_utc=excluded.collected_time_utc`
        );
        for (let offset = 0; offset < source.history.length; offset += 14) {
          const entries = source.history
            .slice(offset, offset + 14)
            .map(
              (h) =>
                sql`(${lease.accountId},${h.metricId},CAST(${h.dayUtc} AS BIGINT),${h.kind},${h.source},${h.value == null ? null : String(h.value)})`
            );
          queries.push(
            sql`INSERT INTO cloudflare_usage_daily(account_id,metric_id,day_utc,kind,source,value) SELECT * FROM (VALUES ${sql.join(entries, sql`, `)}) AS usage_rows WHERE ${exists} ON CONFLICT(account_id,metric_id,day_utc,kind) DO UPDATE SET source=excluded.source,value=excluded.value WHERE cloudflare_usage_daily.kind <> 'cumulative_snapshot' OR cloudflare_usage_daily.source NOT LIKE ${observationSourcePattern} OR excluded.source LIKE ${observationSourcePattern}`
          );
        }
      }
      const failed = next.coverage.some(
        (c) => c.status !== "available" && c.status !== "reference"
      );
      const state =
        next.snapshots.length === 0
          ? "failed"
          : failed
            ? "partial"
            : "complete";
      queries.push(
        sql`DELETE FROM cloudflare_usage_daily WHERE account_id=${lease.accountId} AND day_utc < ${now - 90 * DAY_MS} AND ${exists}`
      );
      queries.push(
        sql`UPDATE cloudflare_usage_sync SET state=${state}, last_success_time_utc=${next.snapshots.length ? sql`${now}` : sql`last_success_time_utc`}, next_run_time_utc=${Math.max(now + 60000, next.startedTimeUtc + INTERVAL_MS)}, retry_time_utc=NULL, owner=NULL, lease_expires_time_utc=0, cursor_json=NULL, coverage_json=${JSON.stringify(next.coverage)}, attempts=0 WHERE ${guard(lease, now)} RETURNING account_id`
      );
      const results = await port.batch(queries);
      return results.at(-1)?.length === 1;
    },
    async fail(lease, failedCoverage, now, retryTimeUtc) {
      const result = await port.rows(
        sql`UPDATE cloudflare_usage_sync SET state='pending', owner=NULL, lease_expires_time_utc=0, attempts=attempts+1, retry_time_utc=${retryTimeUtc}, coverage_json=${JSON.stringify(failedCoverage)} WHERE ${guard(lease, now)} RETURNING account_id`
      );
      return result.length === 1;
    },
  };
}
