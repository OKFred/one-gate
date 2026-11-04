import type { FromSchema } from "json-schema-to-ts";
import type {
  Clock,
  DeviceReader,
  DeviceTaskActor,
  IdGenerator,
} from "../application/ports.js";
import {
  assertTaskRuntimeReportTime,
  parseTaskRuntimeSnapshot,
  TASK_CANCEL_TTL_MS,
  TASK_RUNTIME_TTL_MS,
  TaskRuntimeError,
  type TaskRuntimeSnapshot,
} from "./domain.js";
import type { MobileTaskRuntimeStateResSchema } from "./model.js";
import type { TaskRuntimeRecord } from "./repository.js";

export interface TaskCancelCommand {
  protocolVersion: 2;
  action: "CANCEL";
  commandId: string;
  taskId: string;
  createdAt: number;
  expiresAt: number;
}

export interface TaskRuntimeDependencies {
  repository: {
    get(clientId: string): Promise<TaskRuntimeRecord | undefined>;
    store(
      snapshot: TaskRuntimeSnapshot,
      receivedTimeUtc: number,
      reportTokenHash: string
    ): Promise<boolean>;
    cancellableTaskIds(
      snapshot: TaskRuntimeSnapshot,
      now: number
    ): Promise<string[]>;
  };
  devices: DeviceReader;
  publisher: {
    publish(
      clientId: string,
      command: TaskCancelCommand,
      actor: DeviceTaskActor
    ): Promise<void>;
  };
  clock: Clock;
  ids: IdGenerator;
}

export class TaskRuntimeCenter {
  constructor(private readonly dependencies: TaskRuntimeDependencies) {}

  async report(input: unknown, reportTokenHash: string): Promise<boolean> {
    const snapshot = parseTaskRuntimeSnapshot(input);
    const receivedTimeUtc = this.dependencies.clock.now();
    assertTaskRuntimeReportTime(snapshot, receivedTimeUtc);
    return this.dependencies.repository.store(
      snapshot,
      receivedTimeUtc,
      reportTokenHash
    );
  }

  async state(
    clientId: string
  ): Promise<FromSchema<typeof MobileTaskRuntimeStateResSchema>> {
    const device = await this.dependencies.devices.getByClientId(clientId);
    if (!device) throw new TaskRuntimeError("MOBILE_TASK_DEVICE_UNAVAILABLE");
    const record = await this.dependencies.repository.get(clientId);
    const now = this.dependencies.clock.now();
    const snapshot = record
      ? parseTaskRuntimeSnapshot(JSON.parse(record.snapshotJson) as unknown)
      : null;
    if (
      snapshot &&
      (snapshot.deviceId !== clientId ||
        snapshot.sessionId !== record?.sessionId ||
        snapshot.revision !== record?.revision ||
        snapshot.sessionStartedAt !== record?.sessionStartedAt ||
        snapshot.timestamp !== record?.deviceTimeUtc)
    ) {
      throw new TaskRuntimeError("MOBILE_TASK_RUNTIME_INVALID");
    }
    const stale =
      !record ||
      !device.isEnabled ||
      now < record.receivedTimeUtc ||
      now - record.receivedTimeUtc > TASK_RUNTIME_TTL_MS;
    return {
      clientId,
      serverTimeUtc: now,
      receivedTimeUtc: record?.receivedTimeUtc ?? null,
      stale,
      snapshot,
      cancellableTaskIds:
        snapshot && !stale
          ? await this.dependencies.repository.cancellableTaskIds(snapshot, now)
          : [],
    };
  }

  async cancel(
    input: { clientId: string; taskId: string },
    actor: DeviceTaskActor
  ) {
    const state = await this.state(input.clientId);
    if (state.stale) throw new TaskRuntimeError("MOBILE_TASK_RUNTIME_STALE");
    if (!state.cancellableTaskIds.includes(input.taskId)) {
      throw new TaskRuntimeError("MOBILE_TASK_NOT_CANCELLABLE");
    }
    const createdAt = this.dependencies.clock.now();
    if (
      state.receivedTimeUtc === null ||
      createdAt < state.receivedTimeUtc ||
      createdAt - state.receivedTimeUtc > TASK_RUNTIME_TTL_MS
    ) {
      throw new TaskRuntimeError("MOBILE_TASK_RUNTIME_STALE");
    }
    const command: TaskCancelCommand = {
      protocolVersion: 2,
      action: "CANCEL",
      commandId: this.dependencies.ids.next(),
      taskId: input.taskId,
      createdAt,
      expiresAt: createdAt + TASK_CANCEL_TTL_MS,
    };
    try {
      await this.dependencies.publisher.publish(input.clientId, command, actor);
    } catch {
      // A lost publish acknowledgement cannot prove that the phone did not receive it.
      throw new TaskRuntimeError("MOBILE_TASK_CANCEL_OUTCOME_UNKNOWN");
    }
    return {
      taskId: input.taskId,
      commandId: command.commandId,
      status: "CANCEL_REQUESTED" as const,
    };
  }
}
