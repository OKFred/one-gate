import { integer } from "drizzle-orm/sqlite-core";

export const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const SOFT_DELETE_BATCH_SIZE = 100;
export const SOFT_DELETE_UNDO_WINDOW_MS = 15_000;

/** Each table gets its own builders. System-owned values are set on insertion. */
export function softDeleteColumns() {
  return {
    isDeleted: integer("is_deleted", { mode: "boolean" }).notNull(),
    deletedTimeUtc: integer("deleted_time_utc"),
    deleterId: integer("deleter_id"),
  };
}

export interface SoftDeleteCleanupInput {
  now: number;
  batchSize: number;
}

export interface SoftDeleteCleanupResult {
  deletedCount: number;
  remainingExpired: number;
  /** Earliest expiration deadline still in storage, not the original deletion time. */
  oldestExpiredTimeUtc: number | null;
}

export interface SoftDeleteCleanupAdapter {
  module: string;
  purgeExpired(input: SoftDeleteCleanupInput): Promise<SoftDeleteCleanupResult>;
}

export interface SoftDeleteCleanupLogger {
  info(event: Record<string, string | number | null>): void;
  warn(event: Record<string, string | number | null>): void;
  error(event: Record<string, string | number | null>): void;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Validate only the post-cleanup observation; concurrent writers may change totals. */
function isCleanupResult(
  value: unknown,
  now: number
): value is SoftDeleteCleanupResult {
  if (
    typeof value !== "object" ||
    value === null ||
    !("deletedCount" in value) ||
    !("remainingExpired" in value) ||
    !("oldestExpiredTimeUtc" in value) ||
    !isNonNegativeInteger(value.deletedCount) ||
    value.deletedCount > SOFT_DELETE_BATCH_SIZE ||
    !isNonNegativeInteger(value.remainingExpired)
  ) {
    return false;
  }
  return value.remainingExpired === 0
    ? value.oldestExpiredTimeUtc === null
    : isNonNegativeInteger(value.oldestExpiredTimeUtc) &&
        value.oldestExpiredTimeUtc <= now;
}

/** Run only the explicitly supplied adapters; a failure never skips another one. */
export async function runSoftDeleteCleanup(
  adapters: readonly SoftDeleteCleanupAdapter[],
  now = Date.now(),
  logger: SoftDeleteCleanupLogger = console
): Promise<void> {
  let failed = false;
  for (const adapter of adapters) {
    const startedAt = Date.now();
    const context = {
      module: adapter.module,
      checkedTimeUtc: now,
      cutoffTimeUtc: now - SOFT_DELETE_RETENTION_MS,
    };
    try {
      const result = await adapter.purgeExpired({
        now,
        batchSize: SOFT_DELETE_BATCH_SIZE,
      });
      if (!isCleanupResult(result, now)) {
        failed = true;
        logger.error({
          event: "soft_delete_cleanup_failed",
          ...context,
          errorCode: "CLEANUP_INVALID_RESULT",
          durationMs: Math.max(0, Date.now() - startedAt),
        });
        continue;
      }
      const event = {
        event: "soft_delete_cleanup",
        ...context,
        // Adapters can return extra business fields; only publish approved metrics.
        deletedCount: result.deletedCount,
        remainingExpired: result.remainingExpired,
        oldestExpiredTimeUtc: result.oldestExpiredTimeUtc,
        overdueMs:
          result.oldestExpiredTimeUtc === null
            ? 0
            : now - result.oldestExpiredTimeUtc,
        durationMs: Math.max(0, Date.now() - startedAt),
      };
      if (result.remainingExpired > 0) logger.warn(event);
      else logger.info(event);
    } catch {
      failed = true;
      // Driver errors may contain SQL parameters or record contents.
      logger.error({
        event: "soft_delete_cleanup_failed",
        ...context,
        errorCode: "CLEANUP_FAILED",
        durationMs: Math.max(0, Date.now() - startedAt),
      });
    }
  }
  if (failed) throw new Error("Soft-delete cleanup failed; retry on next tick");
}
