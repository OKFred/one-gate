import { describe, expect, it, vi } from "vitest";
import type { RecycleBinResourceAdapter } from "@hodor/core/db/recycle-bin.js";

const mocks = vi.hoisted(() => ({
  cleanupDeviceOpsAudits: vi.fn(async () => undefined),
  cleanupExpiredDeviceEvents: vi.fn(async () => undefined),
  createApp: vi.fn(() => ({ fetch: vi.fn() })),
  expireDeviceOpsSessions: vi.fn(async () => undefined),
  getEnv: vi.fn(() => ""),
  markTimedOutDevicesOffline: vi.fn(async () => undefined),
  runPendingJobs: vi.fn(async () => undefined),
  departmentCleanup: vi.fn(async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
  archiveCleanup: vi.fn(async () => ({
    deletedCount: 0,
    remainingExpired: 0,
    oldestExpiredTimeUtc: null,
  })),
  setD1Binding: vi.fn(),
  setEnv: vi.fn(),
  setKVBinding: vi.fn(),
  timeoutExpiredDeviceTasks: vi.fn(async () => undefined),
  verifyDeviceReportToken: vi.fn(async () => undefined),
}));

vi.mock("./index.js", () => ({ default: mocks.createApp }));
vi.mock("./mobile-ops-session.js", () => ({ MobileOpsSession: class {} }));
vi.mock("./totp-gate-coordinator.js", () => ({
  CloudflareTotpAttemptCoordinator: class {},
  TotpGateCoordinator: class {},
}));
vi.mock("@hodor/admin/system/auth/totp-gate/index.js", () => ({
  createTotpGateCenter: vi.fn(),
}));
vi.mock("@hodor/core/db/index.js", () => ({
  setD1Binding: mocks.setD1Binding,
}));
vi.mock("@hodor/core/middleware/cache/index.js", () => ({
  setKVBinding: mocks.setKVBinding,
}));
vi.mock("@hodor/core/utils/env.js", () => ({
  getEnv: mocks.getEnv,
  setEnv: mocks.setEnv,
}));
vi.mock("@hodor/admin/maintenance/cron/scheduler.js", () => ({
  runPendingJobs: mocks.runPendingJobs,
}));
vi.mock("@hodor/admin/system/department/facade.js", () => ({
  departmentRecycleBinAdapter: {
    resourceType: "department",
    labelKey: "business.department",
    can: async () => true,
    list: async () => ({ total: 0, list: [] }),
    restore: async ({ id }) => id,
    purge: async ({ id }) => id,
    purgeExpired: mocks.departmentCleanup,
  } satisfies RecycleBinResourceAdapter,
}));
vi.mock("@hodor/admin/maintenance/compliance/department-cleanup.js", () => ({
  purgeExpiredDepartmentArchives: mocks.archiveCleanup,
}));
vi.mock("@hodor/admin/mobile/async-task/facade.js", () => ({
  timeoutExpiredDeviceTasks: mocks.timeoutExpiredDeviceTasks,
}));
vi.mock("@hodor/admin/mobile/device/facade.js", () => ({
  cleanupExpiredDeviceEvents: mocks.cleanupExpiredDeviceEvents,
  markTimedOutDevicesOffline: mocks.markTimedOutDevicesOffline,
  verifyDeviceReportToken: mocks.verifyDeviceReportToken,
}));
vi.mock("@hodor/admin/mobile/device-ops/facade.js", () => ({
  cleanupDeviceOpsAudits: mocks.cleanupDeviceOpsAudits,
  expireDeviceOpsSessions: mocks.expireDeviceOpsSessions,
}));

import worker from "./worker.js";

describe("Worker scheduled bootstrap", () => {
  it("initializes the application registry before executing pending jobs", async () => {
    let scheduledWork: Promise<unknown> | undefined;
    const waitUntil = vi.fn((promise: Promise<unknown>) => {
      scheduledWork = promise;
    });
    const env = {
      DB: {},
      KV: {},
    } as unknown as Parameters<typeof worker.scheduled>[1];
    const ctx = {
      waitUntil,
    } as unknown as Parameters<typeof worker.scheduled>[2];

    await worker.scheduled(
      {} as Parameters<typeof worker.scheduled>[0],
      env,
      ctx
    );
    await scheduledWork;

    expect(mocks.setD1Binding).toHaveBeenCalledWith(env.DB);
    expect(mocks.setKVBinding).toHaveBeenCalledWith(env.KV);
    expect(mocks.setEnv).toHaveBeenCalledWith(env);
    expect(mocks.createApp).toHaveBeenCalledTimes(1);
    expect(mocks.runPendingJobs).toHaveBeenCalledTimes(1);
    expect(mocks.departmentCleanup).toHaveBeenCalledExactlyOnceWith({
      now: expect.any(Number),
      batchSize: 100,
    });
    expect(mocks.archiveCleanup).toHaveBeenCalledExactlyOnceWith({
      now: expect.any(Number),
      batchSize: 100,
    });
    expect(mocks.createApp.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.departmentCleanup.mock.invocationCallOrder[0]
    );
    expect(mocks.createApp.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.runPendingJobs.mock.invocationCallOrder[0]
    );
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });
});
