import {
  createExecutionContext,
  createScheduledController,
  reset,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isAdminRegistryInitialized,
  registry,
} from "@hodor/admin/common/registry.js";
import db from "@hodor/core/db/index.js";
import { SOFT_DELETE_RETENTION_MS } from "@hodor/core/db/soft-delete.js";
import { setupTestDb } from "@hodor/core/db/testHelper.js";
import departmentSql from "@hodor/core/db/sql/admin/system_department.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import archiveSql from "@hodor/core/db/sql/admin/compliance_archives.sql?raw";
import cronSql from "@hodor/core/db/sql/admin/system_cron_job.sql?raw";
import deviceTaskSql from "@hodor/core/db/sql/admin/admin_mobile_async_task.sql?raw";
import deviceSql from "@hodor/core/db/sql/admin/admin_mobile_device.sql?raw";
import deviceEventSql from "@hodor/core/db/sql/admin/admin_mobile_device_event.sql?raw";
import deviceOpsSql from "../d1-migrations/0003_mobile_device_ops.sql?raw";
import worker from "./worker.js";

/** Run the actual scheduled handler and observe every waitUntil operation. */
async function runScheduledTick(): Promise<void> {
  const context = createExecutionContext();
  const controller = createScheduledController({ cron: "* * * * *" });
  await worker.scheduled(controller, env, context);
  await waitOnExecutionContext(context);
}

/** Seed expired records and controls through the isolated D1 binding. */
async function seedRetentionRecords(): Promise<void> {
  const now = Date.now();
  const expiredAt = now - SOFT_DELETE_RETENTION_MS - 60_000;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO system_department
       (id, name, is_enabled, creator_id, is_deleted, deleted_time_utc, deleter_id)
       VALUES (201, 'expired department', 1, 1, 1, ?, 1),
              (202, 'recent department', 0, 1, 1, ?, 1)`
    ).bind(expiredAt, now),
    env.DB.prepare(
      `INSERT INTO system_role
       (id, name, is_enabled, permission_count, data_scope, creator_id,
        is_deleted, deleted_time_utc, deleter_id)
       VALUES (301, 'expired role', 1, 1, 'all', 1, 1, ?, 1),
              (302, 'recent role', 0, 0, 'all', 1, 1, ?, 1)`
    ).bind(expiredAt, now),
    env.DB.prepare(
      `INSERT INTO system_role_permission (role_id, permission_id, creator_id)
       VALUES (301, 701, 1)`
    ),
    env.DB.prepare(
      `INSERT INTO compliance_archives
       (id, source_system, source_database, source_table, source_primary_key,
        record_snapshot, restorable, creator_id, create_time_utc)
       VALUES (401, 'self', 'self', 'department', '201', 'private-snapshot', 0, 1, ?),
              (402, 'self', 'self', 'system_department', '211', 'private-snapshot', 0, 1, ?),
              (403, 'self', 'external', 'department', '201', 'private-snapshot', 0, 1, ?),
              (404, 'self', 'self', 'department', '202', 'private-snapshot', 0, 1, ?)`
    ).bind(expiredAt, expiredAt, expiredAt, now),
  ]);
}

/** Check both physical cleanup and the records outside its retention scope. */
async function expectRetentionCompleted(): Promise<void> {
  const [departments, roles, permissions, archives] = await Promise.all([
    env.DB.prepare("SELECT id FROM system_department ORDER BY id").all(),
    env.DB.prepare("SELECT id FROM system_role ORDER BY id").all(),
    env.DB.prepare("SELECT id FROM system_role_permission").all(),
    env.DB.prepare("SELECT id FROM compliance_archives ORDER BY id").all(),
  ]);
  expect(departments.results).toEqual([{ id: 202 }]);
  expect(roles.results).toEqual([{ id: 302 }]);
  expect(permissions.results).toEqual([]);
  expect(archives.results).toEqual([{ id: 403 }, { id: 404 }]);
}

describe.sequential(
  "Worker scheduled maintenance with real D1 and registry",
  () => {
    beforeEach(async () => {
      // cloudflare:test resets only the local test bindings, never a remote database.
      await reset();
      await setupTestDb(db, [
        departmentSql,
        roleSql,
        userSql,
        rolePermissionSql,
        archiveSql,
        cronSql,
        deviceTaskSql,
        deviceSql,
        deviceEventSql,
        deviceOpsSql,
      ]);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("starts scheduled before fetch, cleans retained resources, and keeps HTTP usable", async () => {
      const errorLog = vi.spyOn(console, "error");
      const infoLog = vi.spyOn(console, "info");
      const initializationLog = vi.spyOn(console, "log");
      expect(isAdminRegistryInitialized()).toBe(false);

      // All seven real task implementations run against empty current schemas.
      await runScheduledTick();
      expect(isAdminRegistryInitialized()).toBe(true);
      expect(Object.keys(registry).sort()).toEqual([
        "ai",
        "base",
        "i18n",
        "mail",
        "maintenance",
        "mqtt",
        "oss",
        "rpa",
        "swarm_docker",
        "system",
        "voice",
      ]);
      expect(registry.base.httpFetch.fetch).toBeTypeOf("function");
      expect(registry.system.access).toBeDefined();
      const originalBaseRegistry = registry.base;

      await seedRetentionRecords();
      await runScheduledTick();
      await expectRetentionCompleted();
      for (const module of [
        "department",
        "role",
        "legacy_department_archive",
      ]) {
        expect(infoLog).toHaveBeenCalledWith(
          expect.objectContaining({
            event: "soft_delete_cleanup",
            module,
            deletedCount: module === "legacy_department_archive" ? 2 : 1,
            remainingExpired: 0,
            runId: expect.any(String),
          })
        );
      }

      await runScheduledTick();
      await expectRetentionCompleted();

      const fetchContext = createExecutionContext();
      const response = await worker.fetch(
        new Request("https://worker.test/healthCheck"),
        env,
        fetchContext
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        message: "I am OK!",
      });
      await waitOnExecutionContext(fetchContext);
      expect(registry.base).toBe(originalBaseRegistry);
      const initializationEvents = initializationLog.mock.calls.filter(
        ([event]) =>
          typeof event === "string" &&
          event.includes('"event":"admin.registry.initialized"')
      );
      expect(initializationEvents).toHaveLength(1);
      expect(errorLog).not.toHaveBeenCalled();
    });

    it("finishes retention after a D1 task failure and succeeds on the next tick", async () => {
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      const infoLog = vi.spyOn(console, "info").mockImplementation(() => {});
      await seedRetentionRecords();
      await env.DB.prepare("DROP TABLE system_cron_job").run();

      await expect(runScheduledTick()).rejects.toThrow(
        "Scheduled maintenance failed; inspect task logs"
      );
      // The failing Cron query must not abort the concurrent retention operation.
      await expectRetentionCompleted();
      expect(errorLog).toHaveBeenCalledTimes(2);
      expect(errorLog).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          event: "scheduled_task_failed",
          task: "cron_jobs",
          causeCode: "D1_ERROR",
          durationMs: expect.any(Number),
          runId: expect.any(String),
        })
      );
      expect(errorLog).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          event: "scheduled_maintenance_failed",
          taskCount: 7,
          failedTaskCount: 1,
          durationMs: expect.any(Number),
          runId: expect.any(String),
        })
      );
      const taskEvent: unknown = errorLog.mock.calls[0]?.[0];
      const summaryEvent: unknown = errorLog.mock.calls[1]?.[0];
      expect(taskEvent).toHaveProperty("runId");
      if (
        typeof taskEvent !== "object" ||
        taskEvent === null ||
        !("runId" in taskEvent)
      ) {
        throw new Error("Missing scheduled task event");
      }
      expect(summaryEvent).toHaveProperty("runId", taskEvent.runId);
      expect(infoLog).toHaveBeenCalledWith(
        expect.objectContaining({
          module: "department",
          deletedCount: 1,
          runId: taskEvent.runId,
        })
      );
      const serializedLogs = JSON.stringify(errorLog.mock.calls);
      for (const privateValue of [
        "system_cron_job",
        "private-snapshot",
        "SELECT",
        "select",
        "params",
        "stack",
      ]) {
        expect(serializedLogs).not.toContain(privateValue);
      }

      await setupTestDb(db, [cronSql]);
      errorLog.mockClear();
      await runScheduledTick();
      await expectRetentionCompleted();
      expect(errorLog).not.toHaveBeenCalled();
    });
  }
);
