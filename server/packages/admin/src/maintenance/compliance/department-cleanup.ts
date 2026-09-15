import db from "@hodor/core/db/index";
import {
  SOFT_DELETE_RETENTION_MS,
  SOFT_DELETE_BATCH_SIZE,
  type SoftDeleteCleanupInput,
  type SoftDeleteCleanupResult,
} from "@hodor/core/db/soft-delete";
import { and, asc, count, eq, inArray, lte, min } from "drizzle-orm";
import { complianceArchiveTable as archive } from "./model";

/** Retire only this application's historical department snapshots, on their original clock. */
export async function purgeExpiredDepartmentArchives(
  input: SoftDeleteCleanupInput
): Promise<SoftDeleteCleanupResult> {
  const cutoff = input.now - SOFT_DELETE_RETENTION_MS;
  const batchSize = Math.max(
    1,
    Math.min(SOFT_DELETE_BATCH_SIZE, Math.floor(input.batchSize))
  );
  const eligible = and(
    eq(archive.sourceSystem, "self"),
    eq(archive.sourceDatabase, "self"),
    inArray(archive.sourceTable, ["department", "system_department"]),
    lte(archive.createTimeUtc, cutoff)
  );
  const candidates = db
    .select({ id: archive.id })
    .from(archive)
    .where(eligible)
    .orderBy(asc(archive.createTimeUtc), asc(archive.id))
    .limit(batchSize);
  const deleted = await db
    .delete(archive)
    .where(and(eligible, inArray(archive.id, candidates)))
    .returning({ id: archive.id });
  const [remaining] = await db
    .select({
      remainingExpired: count(),
      oldestExpiredTimeUtc: min(archive.createTimeUtc),
    })
    .from(archive)
    .where(eligible);
  return {
    deletedCount: deleted.length,
    remainingExpired: remaining?.remainingExpired ?? 0,
    oldestExpiredTimeUtc:
      remaining?.oldestExpiredTimeUtc == null
        ? null
        : remaining.oldestExpiredTimeUtc + SOFT_DELETE_RETENTION_MS,
  };
}
