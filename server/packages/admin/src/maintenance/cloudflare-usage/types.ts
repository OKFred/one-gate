import type {
  UsageCoverage,
  UsageCost,
  UsageHistory,
  UsageMetric,
  UsageSync,
  UsageRefresh,
} from "./model";
export const DAY_MS = 86_400_000;
export const INTERVAL_MS = 15 * 60_000;
export const LEASE_MS = 55_000;
export interface SourceSnapshot {
  source: string;
  accountName: string | null;
  metrics: UsageMetric[];
  costs: UsageCost[];
  history: UsageHistory[];
  coverage: UsageCoverage[];
  collectedTimeUtc: number;
}
export interface UsageCursor {
  version: 1;
  step: number;
  startedTimeUtc: number;
  snapshots: SourceSnapshot[];
  coverage: UsageCoverage[];
  metadata?: {
    plan: "free" | "standard" | "unknown";
    cycleStart: number | null;
    cycleEnd: number | null;
    anchor: number | null;
    covered: boolean | null;
    subscriptionPage: number;
    datasetNames: string[];
    r2Standard?: boolean;
    analytics?: {
      nextStartUtc: number;
      maxDurationMs: number;
      retainedStartUtc: number;
      pageLimit: number;
      fields: string[];
      history: UsageHistory[];
    };
  };
}
export interface Lease {
  accountId: string;
  jobId: string;
  owner: string;
  generation: number;
  attempts: number;
  cursor: UsageCursor;
}
export interface StoredUsage {
  snapshots: SourceSnapshot[];
  history: UsageHistory[];
  coverage: UsageCoverage[];
  sync: UsageSync;
}
export interface UsageRepository {
  read(accountId: string, since: number): Promise<StoredUsage>;
  request(
    accountId: string,
    now: number,
    jobId: string,
    manual: boolean
  ): Promise<UsageRefresh>;
  claim(accountId: string, now: number, owner: string): Promise<Lease | null>;
  checkpoint(lease: Lease, cursor: UsageCursor, now: number): Promise<boolean>;
  publish(lease: Lease, cursor: UsageCursor, now: number): Promise<boolean>;
  fail(
    lease: Lease,
    coverage: UsageCoverage[],
    now: number,
    retryTimeUtc: number
  ): Promise<boolean>;
}
export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
