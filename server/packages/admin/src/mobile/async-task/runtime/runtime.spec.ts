import { OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, sql } from "drizzle-orm";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import db, { getDb } from "@hodor/core/db";
import { setupTestDb } from "@hodor/core/db/testHelper";
import deviceDdl from "@hodor/core/db/sql/admin/admin_mobile_device.sql?raw";
import taskDdl from "@hodor/core/db/sql/admin/admin_mobile_async_task.sql?raw";
import runtimeDdl from "@hodor/core/db/sql/admin/admin_mobile_task_runtime.sql?raw";
import type { AppBindings, Context, UserObj } from "@hodor/core/types/app";
import {
  BusinessError,
  BusinessErrorCode,
} from "@hodor/core/middleware/errorHandler/businessError";
import errorHandler from "@hodor/core/middleware/errorHandler";
import { setEnv } from "@hodor/core/utils/env";
import { hashDeviceToken } from "../../device/infrastructure/crypto.js";
import { mobileDeviceTable } from "../../device/model.js";
import createDeviceApp from "../../device/index.js";
import createTaskApp from "../index.js";
import { mobileAsyncTaskTable } from "../model.js";
import { mobileTaskRuntimeTable } from "./model.js";
import { TaskRuntimeRepository } from "./repository.js";
import { type TaskRuntimeSnapshot } from "./domain.js";

const state = vi.hoisted(() => ({
  actor: undefined as UserObj | undefined,
  publish: vi.fn(),
}));
vi.mock("@hodor/core/middleware/auth", () => ({
  authMiddleware: async (context: Context) => {
    if (!state.actor)
      throw new BusinessError(BusinessErrorCode.NOT_AUTHENTICATED);
    context.set("userObj", state.actor);
  },
}));
vi.mock("@hodor/core/utils/i18n/index.js", () => ({
  getTranslator: async () => async (key: string) => key,
}));
vi.mock("../../../mqtt/service.js", () => ({
  publishDeviceManagementCommand: state.publish,
  default: { publish: { service: vi.fn() } },
}));

const clientId = "synthetic-device-1";
const token = "synthetic-device-token";
const now = 1_800_000_000_000;
const repository = new TaskRuntimeRepository();
const app = new OpenAPIHono<AppBindings>();

function actor(actions = ["read", "dispatch"]): UserObj {
  return {
    principal: { kind: "user", userId: 42 },
    id: 42,
    userId: 42,
    username: "synthetic-operator",
    langCode: "en-US",
    isEnabled: true,
    token: "synthetic-session",
    isSuperAdmin: false,
    roleIds: [],
    dataScope: "all",
    customDeptIds: [],
    permissions: actions.map((action, index) => ({
      id: index + 1,
      code: `admin.mobile.async_task:${action}`,
      name: action,
      category: "action",
      resource: null,
      business: null,
      remark: null,
      isEnabled: true,
      creatorId: 42,
      updaterId: null,
      createTimeUtc: 0,
      updateTimeUtc: null,
    })),
    ensureLoaded: async () => undefined,
  };
}

function snapshot(
  overrides: Partial<TaskRuntimeSnapshot> = {}
): TaskRuntimeSnapshot {
  return {
    protocolVersion: 2,
    deviceId: clientId,
    timestamp: now,
    sessionId: "synthetic-session-1",
    sessionStartedAt: now - 10_000,
    revision: 1,
    running: null,
    queued: [
      {
        taskId: "synthetic-task-1",
        scriptId: "device.apps.list",
        priority: "HIGH",
        createdAt: now - 500,
        startedAt: null,
        position: 1,
        phase: "QUEUED",
        cancellable: true,
      },
    ],
    ...overrides,
  };
}

async function addTask(
  overrides: Partial<typeof mobileAsyncTaskTable.$inferInsert> = {}
) {
  await db.insert(mobileAsyncTaskTable).values({
    taskId: "synthetic-task-1",
    clientId,
    cat: "autojs6-v2",
    script: "device.apps.list",
    protocolVersion: 2,
    scriptId: "device.apps.list",
    scriptVersion: 1,
    traceId: "synthetic-trace-1",
    priority: "HIGH",
    preemptRunning: false,
    status: "PENDING",
    expiresAtUtc: now + 120_000,
    creatorId: 42,
    ...overrides,
  });
}

function request(path: string, body: object, reportToken?: string) {
  return app.request(`http://runtime.test/api/v1/admin/mobile/${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(reportToken === undefined ? {} : { "x-device-token": reportToken }),
    },
    body: JSON.stringify(body),
  });
}
function report(value = snapshot(), reportToken: string | undefined = token) {
  return request("device/report/task-state", value, reportToken);
}
function readState() {
  return request("async-task/state", { clientId });
}
function cancel() {
  return request("async-task/cancel", { clientId, taskId: "synthetic-task-1" });
}

describe("mobile task runtime HTTP and atomic storage (SQLite and D1)", () => {
  beforeAll(async () => {
    setEnv({ BASE_API_PATH: "/api/v1", NODE_ENV: "test", LOCALE: "en-US" });
    await db.run(sql`PRAGMA foreign_keys = ON`);
    await setupTestDb(db, [deviceDdl, taskDdl, runtimeDdl]);
    errorHandler(app);
    app.route("/api/v1/admin/mobile/device", createDeviceApp());
    app.route("/api/v1/admin/mobile/async-task", createTaskApp());
  });
  beforeEach(async () => {
    vi.spyOn(Date, "now").mockReturnValue(now);
    vi.clearAllMocks();
    state.publish.mockResolvedValue({ traceId: "synthetic-control-trace" });
    state.actor = actor();
    await db.delete(mobileTaskRuntimeTable);
    await db.delete(mobileAsyncTaskTable);
    await db.delete(mobileDeviceTable);
    await db.insert(mobileDeviceTable).values({
      clientId,
      isEnabled: true,
      creatorId: 42,
      reportTokenHash: await hashDeviceToken(token),
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("distinguishes no snapshot from a reported empty queue", async () => {
    expect(await (await readState()).json()).toMatchObject({
      ok: true,
      data: {
        snapshot: null,
        receivedTimeUtc: null,
        stale: true,
        cancellableTaskIds: [],
      },
    });
    expect(await (await report(snapshot({ queued: [] }))).json()).toMatchObject(
      { ok: true, data: true }
    );
    expect(await (await readState()).json()).toMatchObject({
      ok: true,
      data: {
        snapshot: { running: null, queued: [] },
        receivedTimeUtc: now,
        stale: false,
      },
    });
  });

  it("does not query task history for an empty snapshot", async () => {
    const all = vi.spyOn(getDb(), "all");
    expect(
      await repository.cancellableTaskIds(
        snapshot({ running: null, queued: [] }),
        now
      )
    ).toEqual([]);
    expect(all).not.toHaveBeenCalled();
  });

  it("uses the task ID index and one JSON candidate parameter for a full snapshot", async () => {
    await addTask();
    const value = snapshot({
      running: {
        taskId: "synthetic-running-1",
        scriptId: "device.apps.list",
        priority: "NORMAL",
        createdAt: now - 3000,
        startedAt: now - 2000,
        position: null,
        phase: "RUNNING",
        cancellable: true,
      },
      queued: Array.from({ length: 256 }, (_, index) => ({
        taskId: `synthetic-task-${index + 1}`,
        scriptId: "device.apps.list",
        priority: "HIGH",
        createdAt: now - 1000 + index,
        startedAt: null,
        position: index + 1,
        phase: "QUEUED",
        cancellable: true,
      })),
    });
    expect(await (await report(value)).json()).toMatchObject({
      ok: true,
      data: true,
    });
    const all = vi.spyOn(getDb(), "all");
    expect(await repository.cancellableTaskIds(value, now)).toEqual([
      "synthetic-task-1",
    ]);
    expect(all).toHaveBeenCalledTimes(1);
    const query = all.mock.calls[0][0];
    all.mockRestore();
    const plan = await db.all<{ detail: string }>(
      sql`EXPLAIN QUERY PLAN ${query}`
    );
    expect(
      plan.some((step) =>
        /SEARCH tasks USING INDEX admin_mobile_async_task_id_unique/.test(
          step.detail
        )
      )
    ).toBe(true);
    expect(plan.some((step) => /SCAN tasks/.test(step.detail))).toBe(false);
  });

  it("authenticates phone reports independently from the administrator session", async () => {
    state.actor = undefined;
    expect((await report()).status).toBe(200);
    await db.delete(mobileTaskRuntimeTable);
    for (const reportToken of ["", "incorrect-synthetic-token"]) {
      expect((await report(snapshot(), reportToken)).status).toBe(422);
      expect(await repository.get(clientId)).toBeUndefined();
    }
    expect((await request("device/report/task-state", snapshot())).status).toBe(
      422
    );
  });

  it("rejects disabled devices and token rotations in the final insert condition", async () => {
    const originalHash = await hashDeviceToken(token);
    await db
      .update(mobileDeviceTable)
      .set({
        reportTokenHash: await hashDeviceToken("rotated-synthetic-token"),
      })
      .where(eq(mobileDeviceTable.clientId, clientId));
    expect(await repository.store(snapshot(), now, originalHash)).toBe(false);
    await db
      .update(mobileDeviceTable)
      .set({ isEnabled: false, reportTokenHash: originalHash })
      .where(eq(mobileDeviceTable.clientId, clientId));
    expect(await repository.store(snapshot(), now, originalHash)).toBe(false);
    expect((await report()).status).toBe(422);
    expect(await repository.get(clientId)).toBeUndefined();
  });

  it("ignores duplicate/older revisions without extending server freshness", async () => {
    await report();
    vi.mocked(Date.now).mockReturnValue(now + 1_000);
    expect(await (await report()).json()).toMatchObject({
      ok: true,
      data: false,
    });
    expect(
      await (await report(snapshot({ revision: 0 }))).json()
    ).toMatchObject({ ok: false });
    expect((await repository.get(clientId))?.receivedTimeUtc).toBe(now);
    expect(
      await repository.store(
        snapshot({ revision: 2, timestamp: now - 1 }),
        now + 1_000,
        await hashDeviceToken(token)
      )
    ).toBe(false);
  });

  it("accepts a new session while rejecting prior-session replays and impossible session changes", async () => {
    await report();
    const newer = snapshot({
      sessionId: "synthetic-session-2",
      sessionStartedAt: now + 1,
      timestamp: now + 2,
      revision: 1,
    });
    expect(await (await report(newer)).json()).toMatchObject({
      ok: true,
      data: true,
    });
    expect(
      await repository.store(
        snapshot({ revision: 99, timestamp: now + 3 }),
        now,
        await hashDeviceToken(token)
      )
    ).toBe(false);
    expect(
      await repository.store(
        { ...newer, sessionStartedAt: now + 2, revision: 2 },
        now,
        await hashDeviceToken(token)
      )
    ).toBe(false);
    expect((await repository.get(clientId))?.sessionId).toBe(newer.sessionId);
  });

  it("keeps the newest concurrent snapshot", async () => {
    await report();
    const hash = await hashDeviceToken(token);
    await Promise.all([
      repository.store(
        snapshot({ revision: 3, timestamp: now + 2 }),
        now,
        hash
      ),
      repository.store(
        snapshot({ revision: 2, timestamp: now + 1 }),
        now,
        hash
      ),
    ]);
    expect((await repository.get(clientId))?.revision).toBe(3);
  });

  it.each([
    { clientId: "different-synthetic-device" },
    { protocolVersion: 1 },
    { scriptId: "device.network.switch" },
    { status: "SUCCESS" as const },
    { status: "CANCELLED" as const },
    { status: "TIMEOUT" as const },
  ])(
    "does not offer cancellation for a foreign, legacy, mismatched or terminal task",
    async (override) => {
      await addTask(override);
      await report();
      expect(await (await readState()).json()).toMatchObject({
        data: { cancellableTaskIds: [] },
      });
      expect((await cancel()).status).toBe(409);
      expect(state.publish).not.toHaveBeenCalled();
    }
  );

  it("does not offer cancellation for an unregistered task or a STARTING task", async () => {
    await report();
    expect(await (await readState()).json()).toMatchObject({
      data: { cancellableTaskIds: [] },
    });
    await addTask();
    const item = snapshot().queued[0];
    await report(
      snapshot({
        revision: 2,
        running: {
          ...item,
          position: null,
          phase: "STARTING",
          cancellable: false,
        },
        queued: [],
      })
    );
    expect(await (await readState()).json()).toMatchObject({
      data: { cancellableTaskIds: [] },
    });
  });

  it("requires read for state and dispatch for cancellation", async () => {
    await addTask();
    await report();
    state.actor = actor([]);
    expect(await (await readState()).json()).toMatchObject({ ok: false });
    state.actor = actor(["read"]);
    expect(await (await cancel()).json()).toMatchObject({ ok: false });
    expect(state.publish).not.toHaveBeenCalled();
    state.actor = actor(["dispatch"]);
    expect(await (await cancel()).json()).toMatchObject({
      ok: true,
      data: { status: "CANCEL_REQUESTED" },
    });
  });

  it("publishes one exact short-lived control command and never invents a terminal state", async () => {
    await addTask();
    await report();
    expect(await (await readState()).json()).toMatchObject({
      data: { cancellableTaskIds: ["synthetic-task-1"] },
    });
    const response = await cancel();
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { taskId: "synthetic-task-1", status: "CANCEL_REQUESTED" },
    });
    expect(state.publish).toHaveBeenCalledTimes(1);
    const call = state.publish.mock.calls[0][0];
    expect(call).toMatchObject({
      topic: `autojs6/v2/devices/${clientId}/task-control`,
      requireTls: true,
      commandType: "TASK_CANCEL",
    });
    expect(call.payload).toEqual({
      protocolVersion: 2,
      action: "CANCEL",
      commandId: expect.any(String),
      taskId: "synthetic-task-1",
      createdAt: now,
      expiresAt: now + 30_000,
    });
    const [task] = await db.select().from(mobileAsyncTaskTable);
    expect(task.status).toBe("PENDING");
    expect(task.resultCode).toBeNull();
  });

  it("preserves unknown publication outcome and performs no automatic write retry", async () => {
    await addTask();
    await report();
    state.publish.mockRejectedValue(new Error("publish acknowledgement lost"));
    const response = await cancel();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      data: { code: "MOBILE_TASK_CANCEL_OUTCOME_UNKNOWN" },
    });
    expect(state.publish).toHaveBeenCalledTimes(1);
    const [task] = await db.select().from(mobileAsyncTaskTable);
    expect(task.status).toBe("PENDING");
  });

  it("uses server receipt TTL and accepts periodic new revisions during a long running task", async () => {
    await addTask();
    await report();
    vi.mocked(Date.now).mockReturnValue(now + 60_000);
    expect(await (await readState()).json()).toMatchObject({
      data: { stale: false },
    });
    vi.mocked(Date.now).mockReturnValue(now + 60_001);
    expect(await (await readState()).json()).toMatchObject({
      data: { stale: true, cancellableTaskIds: [] },
    });
    expect((await cancel()).status).toBe(409);
    await report(snapshot({ revision: 2, timestamp: now + 60_001 }));
    expect(await (await readState()).json()).toMatchObject({
      data: {
        stale: false,
        receivedTimeUtc: now + 60_001,
        cancellableTaskIds: ["synthetic-task-1"],
      },
    });
    vi.mocked(Date.now).mockReturnValue(now - 1);
    expect(await (await readState()).json()).toMatchObject({
      data: { stale: true, cancellableTaskIds: [] },
    });
  });

  it("rejects expired/future reports and private fields before persistence", async () => {
    for (const invalid of [
      { ...snapshot(), params: { secret: "synthetic" } },
      snapshot({ timestamp: now - 60_001, running: null, queued: [] }),
      snapshot({ timestamp: now + 30_001 }),
    ]) {
      expect(
        (await request("device/report/task-state", invalid, token)).status
      ).toBe(422);
      expect(await repository.get(clientId)).toBeUndefined();
    }
  });

  it("keeps terminal history authoritative when a delayed phone snapshot still lists the task", async () => {
    await addTask();
    await report();
    await db
      .update(mobileAsyncTaskTable)
      .set({ status: "CANCELLED", resultCode: "OPERATOR_CANCELLED" })
      .where(
        and(
          eq(mobileAsyncTaskTable.clientId, clientId),
          eq(mobileAsyncTaskTable.taskId, "synthetic-task-1")
        )
      );
    await report(snapshot({ revision: 2 }));
    expect(await (await readState()).json()).toMatchObject({
      data: { cancellableTaskIds: [] },
    });
    const [task] = await db.select().from(mobileAsyncTaskTable);
    expect(task.status).toBe("CANCELLED");
  });

  it("accepts the original authenticated cancellation callback once without rewriting its outcome", async () => {
    await addTask();
    await report();
    const result = {
      protocolVersion: 2,
      taskId: "synthetic-task-1",
      deviceId: clientId,
      scriptId: "device.apps.list",
      status: "CANCELLED",
      code: "PUBLISH_OUTCOME_UNKNOWN",
      message: "Synthetic already-submitted side effect",
      data: { retrySafe: false },
      startedAt: now - 100,
      finishedAt: now,
      durationMs: 100,
      traceId: "synthetic-trace-1",
    };
    expect(
      await (await request("async-task/callback", result, token)).json()
    ).toMatchObject({ ok: true, data: true });
    expect(
      await (
        await request(
          "async-task/callback",
          { ...result, status: "SUCCESS", code: "LATE_SUCCESS" },
          token
        )
      ).json()
    ).toMatchObject({ ok: true, data: false });
    const [task] = await db.select().from(mobileAsyncTaskTable);
    expect(task).toMatchObject({
      status: "CANCELLED",
      resultCode: "PUBLISH_OUTCOME_UNKNOWN",
      resultDataJson: JSON.stringify({ retrySafe: false }),
    });
    expect(await (await readState()).json()).toMatchObject({
      data: { cancellableTaskIds: [] },
    });
  });

  it("removes the snapshot when its device is removed", async () => {
    await report();
    await db
      .delete(mobileDeviceTable)
      .where(eq(mobileDeviceTable.clientId, clientId));
    expect(await repository.get(clientId)).toBeUndefined();
  });
});
