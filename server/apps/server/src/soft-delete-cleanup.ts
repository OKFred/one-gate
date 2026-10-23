import {
  runSoftDeleteCleanup,
  type SoftDeleteCleanupAdapter,
  type SoftDeleteCleanupInput,
} from "@hodor/core/db/soft-delete.js";
import { purgeExpiredDepartmentArchives } from "@hodor/admin/maintenance/compliance/department-cleanup.js";
import { recycleBinRegistry } from "./recycle-bin-resources.js";
import type { ScheduledMaintenanceContext } from "./scheduled-maintenance.js";

export {
  runScheduledMaintenance,
  type ScheduledMaintenanceContext,
  type ScheduledMaintenanceTask,
  type ScheduledMaintenanceTaskName,
} from "./scheduled-maintenance.js";

const legacyDepartmentArchiveCleanup: SoftDeleteCleanupAdapter = {
  module: "legacy_department_archive",
  purgeExpired: purgeExpiredDepartmentArchives,
};

/** Keep resource diagnostics correlated with their enclosing maintenance run. */
export const runRetentionMaintenance = (
  context?: ScheduledMaintenanceContext
) =>
  runSoftDeleteCleanup(
    [
      ...recycleBinRegistry.list().map((adapter) => ({
        module: adapter.resourceType,
        purgeExpired: (input: SoftDeleteCleanupInput) =>
          adapter.purgeExpired(input),
      })),
      legacyDepartmentArchiveCleanup,
    ],
    Date.now(),
    context
      ? {
          info: (event) => console.info({ ...event, runId: context.runId }),
          warn: (event) => console.warn({ ...event, runId: context.runId }),
          error: (event) => console.error({ ...event, runId: context.runId }),
        }
      : console
  );
