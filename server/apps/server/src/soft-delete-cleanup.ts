import {
  runSoftDeleteCleanup,
  type SoftDeleteCleanupAdapter,
} from "@hodor/core/db/soft-delete.js";
import { purgeExpiredDepartments } from "@hodor/admin/system/department/facade.js";
import { purgeExpiredDepartmentArchives } from "@hodor/admin/maintenance/compliance/department-cleanup.js";

const cleanupAdapters = [
  { module: "department", purgeExpired: purgeExpiredDepartments },
  {
    module: "legacy_department_archive",
    purgeExpired: purgeExpiredDepartmentArchives,
  },
] as const satisfies readonly SoftDeleteCleanupAdapter[];

export const runRetentionMaintenance = () =>
  runSoftDeleteCleanup(cleanupAdapters);

/** Await every task even when a user-editable Cron or an unrelated maintenance task fails. */
export async function runScheduledMaintenance(
  tasks: readonly (() => Promise<unknown>)[]
): Promise<void> {
  const results = await Promise.allSettled(tasks.map(async (task) => task()));
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("Scheduled maintenance failed; inspect task logs");
  }
}
