import { integer } from "drizzle-orm/sqlite-core";

export const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const SOFT_DELETE_BATCH_SIZE = 100;

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

/** Run only the explicitly supplied adapters; a failure never skips another one. */
export async function runSoftDeleteCleanup(
  adapters: readonly SoftDeleteCleanupAdapter[],
  now = Date.now(),
  logger: SoftDeleteCleanupLogger = console
): Promise<void> {
  let failed = false;
  for (const adapter of adapters) {
    const startedAt = Date.now();
    try {
      const result = await adapter.purgeExpired({
        now,
        batchSize: SOFT_DELETE_BATCH_SIZE,
      });
      const event = {
        event: "soft_delete_cleanup",
        module: adapter.module,
        ...result,
        durationMs: Date.now() - startedAt,
      };
      if (result.remainingExpired > 0) logger.warn(event);
      else if (result.deletedCount > 0) logger.info(event);
    } catch {
      failed = true;
      // Driver errors may contain SQL parameters or record contents.
      logger.error({
        event: "soft_delete_cleanup_failed",
        module: adapter.module,
        errorCode: "CLEANUP_FAILED",
        durationMs: Date.now() - startedAt,
      });
    }
  }
  if (failed) throw new Error("Soft-delete cleanup failed; retry on next tick");
}
