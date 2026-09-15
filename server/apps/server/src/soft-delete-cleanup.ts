import {
  runSoftDeleteCleanup,
  type SoftDeleteCleanupAdapter,
  type SoftDeleteCleanupInput,
} from "@hodor/core/db/soft-delete.js";
import { purgeExpiredDepartmentArchives } from "@hodor/admin/maintenance/compliance/department-cleanup.js";
import { recycleBinRegistry } from "./recycle-bin-resources.js";

const legacyDepartmentArchiveCleanup: SoftDeleteCleanupAdapter = {
  module: "legacy_department_archive",
  purgeExpired: purgeExpiredDepartmentArchives,
};

export const runRetentionMaintenance = () =>
  runSoftDeleteCleanup([
    ...recycleBinRegistry.list().map((adapter) => ({
      module: adapter.resourceType,
      purgeExpired: (input: SoftDeleteCleanupInput) =>
        adapter.purgeExpired(input),
    })),
    legacyDepartmentArchiveCleanup,
  ]);

/** Await every task even when a user-editable Cron or an unrelated maintenance task fails. */
export async function runScheduledMaintenance(
  tasks: readonly (() => Promise<unknown>)[]
): Promise<void> {
  const results = await Promise.allSettled(tasks.map(async (task) => task()));
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("Scheduled maintenance failed; inspect task logs");
  }
}
