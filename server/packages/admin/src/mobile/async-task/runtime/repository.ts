import { eq, sql } from "drizzle-orm";
import db from "@hodor/core/db";
import { mobileDeviceTable } from "../../device/model.js";
import { mobileAsyncTaskTable } from "../model.js";
import { mobileTaskRuntimeTable } from "./model.js";
import { TASK_RUNTIME_TTL_MS, type TaskRuntimeSnapshot } from "./domain.js";

export type TaskRuntimeRecord = typeof mobileTaskRuntimeTable.$inferSelect;

export class TaskRuntimeRepository {
  async get(clientId: string): Promise<TaskRuntimeRecord | undefined> {
    const [row] = await db
      .select()
      .from(mobileTaskRuntimeTable)
      .where(eq(mobileTaskRuntimeTable.clientId, clientId));
    return row;
  }

  /** A duplicate report never refreshes the server receipt time. */
  async store(
    snapshot: TaskRuntimeSnapshot,
    receivedTimeUtc: number,
    reportTokenHash: string
  ): Promise<boolean> {
    const rows = await db.all<{ clientId: string }>(sql`
      INSERT INTO ${mobileTaskRuntimeTable}
        (client_id, session_id, session_started_at, revision, device_time_utc, received_time_utc, snapshot_json)
      SELECT ${snapshot.deviceId}, ${snapshot.sessionId}, ${snapshot.sessionStartedAt},
        ${snapshot.revision}, ${snapshot.timestamp}, ${receivedTimeUtc}, ${JSON.stringify(snapshot)}
      WHERE EXISTS (
        SELECT 1 FROM ${mobileDeviceTable}
        WHERE client_id = ${snapshot.deviceId} AND is_enabled = 1
          AND report_token_hash = ${reportTokenHash}
      )
      ON CONFLICT(client_id) DO UPDATE SET
        session_id = excluded.session_id,
        session_started_at = excluded.session_started_at,
        revision = excluded.revision,
        device_time_utc = excluded.device_time_utc,
        received_time_utc = excluded.received_time_utc,
        snapshot_json = excluded.snapshot_json
      WHERE excluded.device_time_utc >= ${mobileTaskRuntimeTable}.device_time_utc
        AND (
          (excluded.session_id = ${mobileTaskRuntimeTable}.session_id
            AND excluded.session_started_at = ${mobileTaskRuntimeTable}.session_started_at
            AND excluded.revision > ${mobileTaskRuntimeTable}.revision)
          OR
          (excluded.session_id <> ${mobileTaskRuntimeTable}.session_id
            AND excluded.session_started_at > ${mobileTaskRuntimeTable}.session_started_at)
        )
      RETURNING client_id AS clientId
    `);
    return rows.length > 0;
  }

  /** Bind eligibility to the exact snapshot and active task identity in SQL. */
  async cancellableTaskIds(
    snapshot: TaskRuntimeSnapshot,
    now: number
  ): Promise<string[]> {
    const taskIds = [
      ...(snapshot.running ? [snapshot.running.taskId] : []),
      ...snapshot.queued.map((item) => item.taskId),
    ];
    if (taskIds.length === 0) return [];
    const rows = await db.all<{ taskId: string }>(sql`
      SELECT tasks.task_id AS taskId
      FROM ${mobileAsyncTaskTable} AS tasks
      INNER JOIN ${mobileTaskRuntimeTable} AS runtime ON runtime.client_id = tasks.client_id
      INNER JOIN ${mobileDeviceTable} AS devices ON devices.client_id = tasks.client_id
      WHERE tasks.task_id IN (SELECT value FROM json_each(${JSON.stringify(taskIds)}))
        AND tasks.client_id = ${snapshot.deviceId}
        AND tasks.protocol_version = 2
        AND tasks.status IN ('PENDING', 'RUNNING')
        AND devices.is_enabled = 1
        AND runtime.session_id = ${snapshot.sessionId}
        AND runtime.revision = ${snapshot.revision}
        AND runtime.received_time_utc >= ${now - TASK_RUNTIME_TTL_MS}
        AND runtime.received_time_utc <= ${now}
        AND (
          (json_extract(runtime.snapshot_json, '$.running.taskId') = tasks.task_id
            AND json_extract(runtime.snapshot_json, '$.running.scriptId') = tasks.script_id
            AND json_extract(runtime.snapshot_json, '$.running.cancellable') = 1)
          OR EXISTS (
            SELECT 1 FROM json_each(runtime.snapshot_json, '$.queued') AS queued
            WHERE json_extract(queued.value, '$.taskId') = tasks.task_id
              AND json_extract(queued.value, '$.scriptId') = tasks.script_id
              AND json_extract(queued.value, '$.cancellable') = 1
          )
        )
    `);
    return rows.map((row) => row.taskId);
  }
}
