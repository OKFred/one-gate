import { validate } from "@cfworker/json-schema";
import type { FromSchema } from "json-schema-to-ts";
import { MobileTaskRuntimeReportSchema } from "./model.js";

export const TASK_RUNTIME_TTL_MS = 60_000;
export const TASK_CANCEL_TTL_MS = 30_000;
export const TASK_RUNTIME_MAX_BYTES = 256 * 1024;
export type TaskRuntimeSnapshot = FromSchema<
  typeof MobileTaskRuntimeReportSchema
>;

export type TaskRuntimeErrorCode =
  | "MOBILE_TASK_RUNTIME_INVALID"
  | "MOBILE_TASK_RUNTIME_STALE"
  | "MOBILE_TASK_DEVICE_UNAVAILABLE"
  | "MOBILE_TASK_NOT_CANCELLABLE"
  | "MOBILE_TASK_CANCEL_OUTCOME_UNKNOWN";

export class TaskRuntimeError extends Error {
  constructor(readonly code: TaskRuntimeErrorCode) {
    super(code);
    this.name = "TaskRuntimeError";
  }
}

function invalid(): never {
  throw new TaskRuntimeError("MOBILE_TASK_RUNTIME_INVALID");
}

/** Reject malformed or reordered snapshots rather than inventing queue state. */
export function parseTaskRuntimeSnapshot(value: unknown): TaskRuntimeSnapshot {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return invalid();
  }
  if (
    new TextEncoder().encode(serialized).byteLength > TASK_RUNTIME_MAX_BYTES ||
    !validate(value, MobileTaskRuntimeReportSchema as object, "2020-12").valid
  ) {
    return invalid();
  }
  const snapshot = value as TaskRuntimeSnapshot;
  if (
    ![snapshot.timestamp, snapshot.sessionStartedAt, snapshot.revision].every(
      Number.isSafeInteger
    ) ||
    snapshot.sessionStartedAt > snapshot.timestamp
  ) {
    return invalid();
  }
  const items = [
    ...(snapshot.running ? [snapshot.running] : []),
    ...snapshot.queued,
  ];
  if (new Set(items.map((item) => item.taskId)).size !== items.length) {
    return invalid();
  }
  for (const item of items) {
    if (
      !Number.isSafeInteger(item.createdAt) ||
      item.createdAt > snapshot.timestamp ||
      (item.startedAt !== null &&
        (!Number.isSafeInteger(item.startedAt) ||
          item.startedAt < item.createdAt ||
          item.startedAt > snapshot.timestamp))
    ) {
      return invalid();
    }
  }
  const running = snapshot.running;
  if (
    running &&
    (running.position !== null ||
      running.phase === "QUEUED" ||
      (running.phase === "STARTING" && running.cancellable) ||
      (running.phase === "RUNNING" && running.startedAt === null))
  ) {
    return invalid();
  }
  const ranks = { HIGH: 3, NORMAL: 2, LOW: 1 } as const;
  for (const [index, item] of snapshot.queued.entries()) {
    const previous = snapshot.queued[index - 1];
    if (
      item.phase !== "QUEUED" ||
      item.startedAt !== null ||
      item.position !== index + 1 ||
      (previous &&
        (ranks[item.priority] > ranks[previous.priority] ||
          (item.priority === previous.priority &&
            item.createdAt < previous.createdAt)))
    ) {
      return invalid();
    }
  }
  return snapshot;
}

/** Buffered old reports must not make an offline phone appear freshly active. */
export function assertTaskRuntimeReportTime(
  snapshot: TaskRuntimeSnapshot,
  now: number
): void {
  if (
    snapshot.timestamp < now - TASK_RUNTIME_TTL_MS ||
    snapshot.timestamp > now + 30_000
  ) {
    invalid();
  }
}
