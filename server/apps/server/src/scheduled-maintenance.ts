import {
  classifySafeErrorCause,
  type SafeErrorCauseCode,
} from "@hodor/core/utils/safe-error-cause.js";

const taskNames = [
  "cron_jobs",
  "device_task_timeouts",
  "device_offline",
  "device_event_cleanup",
  "device_ops_sessions",
  "device_ops_audits",
  "retention",
] as const;

export type ScheduledMaintenanceTaskName = (typeof taskNames)[number];

export interface ScheduledMaintenanceContext {
  readonly runId: string;
}

export interface ScheduledMaintenanceTask {
  readonly name: ScheduledMaintenanceTaskName;
  readonly run: (context: ScheduledMaintenanceContext) => Promise<unknown>;
}

export interface ScheduledMaintenanceLogger {
  error(event: Record<string, string | number>): void;
}

interface TaskFailure {
  readonly task: ScheduledMaintenanceTaskName | "unknown_task";
  readonly causeCode: SafeErrorCauseCode;
  readonly durationMs: number;
}

/** Log failures immediately, then wait for all work before rejecting the tick. */
export async function runScheduledMaintenance(
  tasks: readonly ScheduledMaintenanceTask[],
  logger: ScheduledMaintenanceLogger = console
): Promise<void> {
  const runId = crypto.randomUUID();
  const startedAt = Date.now();
  const context = { level: "error", service: "hodor-server", runId };
  const results = await Promise.all(
    tasks.map(async (task): Promise<TaskFailure | null> => {
      const taskStartedAt = Date.now();
      try {
        await task.run({ runId });
        return null;
      } catch (error: unknown) {
        const failure: TaskFailure = {
          task: taskNames.includes(task.name) ? task.name : "unknown_task",
          causeCode: classifySafeErrorCause(error),
          durationMs: Math.max(0, Date.now() - taskStartedAt),
        };
        logger.error({
          event: "scheduled_task_failed",
          ...context,
          timestamp: new Date().toISOString(),
          ...failure,
        });
        return failure;
      }
    })
  );
  const failures = results.filter((result) => result !== null);
  if (failures.length === 0) return;
  logger.error({
    event: "scheduled_maintenance_failed",
    ...context,
    timestamp: new Date().toISOString(),
    taskCount: tasks.length,
    failedTaskCount: failures.length,
    durationMs: Math.max(0, Date.now() - startedAt),
  });
  throw new Error("Scheduled maintenance failed; inspect task logs");
}
