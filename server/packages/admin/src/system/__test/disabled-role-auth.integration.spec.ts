import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import { authMiddleware } from "@hodor/core/middleware/auth/index";
import { can } from "@hodor/core/middleware/auth/permission";
import { getKV } from "@hodor/core/middleware/cache";
import type { AppBindings, UserObj } from "@hodor/core/types/app";
import { DataScope, type DataScopeValue } from "@hodor/core/types/dataScope";
import { getEnv, setEnv } from "@hodor/core/utils/env";
import { tokenUtils } from "@hodor/core/utils/token";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import { initAdminRegistry } from "../../register";
import { registry } from "../../common/registry";
import { userTable } from "../user/model";
import userService from "../user/service";
import { roleTable } from "../role/model";
import { permissionTable } from "../permission/model";
import { rolePermissionTable } from "../role_permission/model";
import { apiTokenRepository } from "../api-token/repository";

const userId = 701;
const bundleKey = `system.auth.bundle:${userId}`;
const versionKey = "system.auth:global_version";
const resource = "admin.maintenance.recycle_bin";
const cache = getKV();
const cacheValues = new Map<string, string>();
const backgroundTasks: Promise<unknown>[] = [];
let beforeCacheWrite:
  | ((key: string, value: string) => Promise<void>)
  | undefined;
let failVersionRead = false;

type Probe = Pick<
  UserObj,
  "roleIds" | "isSuperAdmin" | "dataScope" | "customDeptIds"
> & {
  initialIsSuperAdmin: boolean;
  permissionCodes: string[];
  mayRead: boolean;
  mayRestore: boolean;
  mayUseUnassignedAction: boolean;
};

const app = new Hono<AppBindings>();
app.post("/authorization-probe", async (context) => {
  await authMiddleware(context);
  const user = context.get("userObj");
  if (!user) throw new Error("Authentication did not populate the context");
  const initialIsSuperAdmin = user.isSuperAdmin;
  await user.ensureLoaded();
  return context.json({
    initialIsSuperAdmin,
    roleIds: user.roleIds,
    isSuperAdmin: user.isSuperAdmin,
    dataScope: user.dataScope,
    customDeptIds: user.customDeptIds,
    permissionCodes: user.permissions
      .map((permission) => permission.code)
      .sort(),
    mayRead: await can(user, "read", resource),
    mayRestore: await can(user, "restore", resource),
    mayUseUnassignedAction: await can(user, "never-assigned", resource),
  });
});

async function authorize(
  token = tokenUtils.generateToken({ userId, username: "auth-role-fixture" }),
  withExecutionContext = true
) {
  const response = await app.request(
    "http://localhost/authorization-probe",
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
    {},
    withExecutionContext
      ? {
          waitUntil: (task) => {
            backgroundTasks.push(task);
          },
          passThroughOnException() {},
          props: {},
        }
      : undefined
  );
  expect(response.status).toBe(200);
  return (await response.json()) as Probe;
}

async function settleBackgroundTasks() {
  await Promise.all(backgroundTasks.splice(0));
}

async function addRole(
  id: number,
  options: {
    enabled?: boolean;
    scope?: DataScopeValue;
    departments?: number[];
    permission?: "read" | "restore";
  } = {}
) {
  await db.insert(roleTable).values({
    id,
    name: `authorization-role-${id}`,
    isEnabled: options.enabled ?? true,
    permissionCount: 1,
    dataScope: options.scope ?? DataScope.SELF_ONLY,
    customDeptIds: options.departments
      ? JSON.stringify(options.departments)
      : null,
    creatorId: userId,
    updateTimeUtc: 100,
  });
  await db.insert(rolePermissionTable).values({
    roleId: id,
    permissionId: options.permission === "restore" ? 2 : 1,
    creatorId: userId,
  });
}

async function bindRoles(roleIds: number[]) {
  await db
    .update(userTable)
    .set({ roleIdArr: roleIds })
    .where(eq(userTable.id, userId));
}

describe("disabled roles through JWT authentication and permission caching", () => {
  const previousJwtSecret = getEnv("JWT_SECRET");

  beforeAll(async () => {
    setEnv({ JWT_SECRET: "disabled-role-auth-test-secret" });
    initAdminRegistry();
    await setupTestDb(db, [userSql, roleSql, permissionSql, rolePermissionSql]);
  });

  beforeEach(async () => {
    cacheValues.clear();
    beforeCacheWrite = undefined;
    failVersionRead = false;
    vi.spyOn(cache, "get").mockImplementation(
      async <T = string>(
        key: string,
        options?: Parameters<typeof cache.get>[1]
      ) => {
        if (key === versionKey && failVersionRead)
          throw new Error("fixture KV read failed");
        const value = cacheValues.get(key);
        if (value === undefined) return null;
        const type = typeof options === "string" ? options : options?.type;
        return (type === "json" ? JSON.parse(value) : value) as T;
      }
    );
    vi.spyOn(cache, "put").mockImplementation(async (key, value) => {
      // Capture a serialized copy before delaying: a later request cannot mutate this write.
      const serialized =
        typeof value === "string" ? value : JSON.stringify(value);
      await beforeCacheWrite?.(key, serialized);
      cacheValues.set(key, serialized);
    });
    vi.spyOn(cache, "delete").mockImplementation(async (key) => {
      cacheValues.delete(key);
    });
    await clearTestData(db, [
      "system_role_permission",
      "system_permission",
      "system_user",
      "system_role",
    ]);
    await db.insert(userTable).values({
      id: userId,
      username: "auth-role-fixture",
      password: "unused-password-hash",
      langCode: "en-US",
      isEnabled: true,
      roleIdArr: [],
      creatorId: userId,
    });
    await db.insert(permissionTable).values(
      ["read", "restore"].map((action, index) => ({
        id: index + 1,
        code: `${resource}:${action}`,
        name: `Fixture ${action}`,
        category: "action",
        business: resource,
        isEnabled: true,
        creatorId: userId,
      }))
    );
    cacheValues.set(versionKey, "1");
  });

  afterEach(async () => {
    await settleBackgroundTasks();
    vi.restoreAllMocks();
  });

  afterAll(() => setEnv({ JWT_SECRET: previousJwtSecret }));

  for (const scope of [DataScope.ALL, DataScope.CUSTOM]) {
    it(`does not derive ${scope} scope or permissions from a disabled role on a cold request`, async () => {
      await addRole(10, { enabled: false, scope, departments: [8, 9] });
      await bindRoles([10]);
      expect(await authorize()).toMatchObject({
        roleIds: [],
        initialIsSuperAdmin: false,
        isSuperAdmin: false,
        dataScope: DataScope.SELF_ONLY,
        customDeptIds: [],
        permissionCodes: [],
        mayRead: false,
      });
      const managedUser = await userService.get.service({ id: userId });
      expect(managedUser?.roleArr).toEqual([
        { value: 10, label: "authorization-role-10" },
      ]);
    });
  }

  it("merges only enabled custom roles while retaining their distinct permissions", async () => {
    await addRole(10, { enabled: false, scope: DataScope.ALL });
    await addRole(20, { scope: DataScope.CUSTOM, departments: [2, 3] });
    await addRole(30, {
      scope: DataScope.CUSTOM,
      departments: [3, 4],
      permission: "restore",
    });
    await bindRoles([30, 10, 20]);
    const result = await authorize();
    expect(result.roleIds).toEqual([20, 30]);
    expect(result.dataScope).toBe(DataScope.CUSTOM);
    expect(result.customDeptIds.slice().sort()).toEqual([2, 3, 4]);
    expect(result.permissionCodes).toEqual([
      `${resource}:read`,
      `${resource}:restore`,
    ]);
    expect(result.mayUseUnassignedAction).toBe(false);
  });

  for (const roleIds of [[], [999]]) {
    it(`keeps self-only access when bound roles are empty or absent (${roleIds.join(",")})`, async () => {
      await bindRoles(roleIds);
      expect(await authorize()).toMatchObject({
        roleIds: [],
        dataScope: DataScope.SELF_ONLY,
        permissionCodes: [],
        mayRead: false,
      });
    });
  }

  it("an anomalously disabled role 1 never grants the super administrator shortcut", async () => {
    await addRole(1, { enabled: false, scope: DataScope.ALL });
    await bindRoles([1]);
    expect(await authorize()).toMatchObject({
      initialIsSuperAdmin: false,
      isSuperAdmin: false,
      roleIds: [],
      mayUseUnassignedAction: false,
    });
    await db
      .update(roleTable)
      .set({ isEnabled: true, updateTimeUtc: 101 })
      .where(eq(roleTable.id, 1));
    expect(await authorize()).toMatchObject({
      initialIsSuperAdmin: true,
      isSuperAdmin: true,
      roleIds: [1],
      mayUseUnassignedAction: true,
    });
  });

  it("rejects an old warm bundle and old global version after disable and re-enable", async () => {
    await addRole(10, { scope: DataScope.ALL });
    await bindRoles([10]);
    expect((await authorize()).mayRead).toBe(true);
    await settleBackgroundTasks();
    const oldBundle = cacheValues.get(bundleKey);
    if (!oldBundle)
      throw new Error("Expected the initial request to write its cache bundle");
    expect(JSON.parse(oldBundle)).toMatchObject({
      schemaVersion: 2,
      roleFingerprint: expect.any(String),
      version: "1",
    });
    await db
      .update(roleTable)
      .set({ isEnabled: false, updateTimeUtc: 101 })
      .where(eq(roleTable.id, 10));
    expect(await authorize()).toMatchObject({
      roleIds: [],
      dataScope: DataScope.SELF_ONLY,
      mayRead: false,
    });
    await settleBackgroundTasks();
    await db
      .update(roleTable)
      .set({
        isEnabled: true,
        dataScope: DataScope.CUSTOM,
        customDeptIds: "[9]",
        updateTimeUtc: 102,
      })
      .where(eq(roleTable.id, 10));
    cacheValues.set(bundleKey, oldBundle);
    expect(await authorize()).toMatchObject({
      roleIds: [10],
      dataScope: DataScope.CUSTOM,
      customDeptIds: [9],
      mayRead: true,
    });
    expect(cacheValues.get(versionKey)).toBe("1");
  });

  it("reuses a valid warm bundle while reading the role authority on every request", async () => {
    await addRole(10, { scope: DataScope.CUSTOM, departments: [9] });
    await bindRoles([10]);
    await authorize();
    await settleBackgroundTasks();
    const roles = vi.spyOn(registry.system, "getAuthorizationRoles");
    const permissions = vi.spyOn(registry.system, "getPermissionsByRoleIds");
    for (let request = 0; request < 2; request++) {
      expect(await authorize()).toMatchObject({
        roleIds: [10],
        dataScope: DataScope.CUSTOM,
        customDeptIds: [9],
        mayRead: true,
      });
    }
    expect(roles).toHaveBeenCalledTimes(2);
    expect(roles).toHaveBeenCalledWith([10]);
    expect(permissions).not.toHaveBeenCalled();
  });

  it("does not trust a warm bundle when the current role authority cannot be read", async () => {
    await addRole(10, { scope: DataScope.ALL });
    await bindRoles([10]);
    await authorize();
    await settleBackgroundTasks();
    vi.spyOn(registry.system, "getAuthorizationRoles").mockRejectedValueOnce(
      new Error("fixture role database unavailable")
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const token = tokenUtils.generateToken({
      userId,
      username: "auth-role-fixture",
    });
    const response = await app.request("http://localhost/authorization-probe", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Internal Server Error");
  });

  it("rebuilds a legacy cache instead of accepting its former scope and permissions", async () => {
    await addRole(10);
    await bindRoles([10]);
    await authorize();
    await settleBackgroundTasks();
    const raw = cacheValues.get(bundleKey);
    if (!raw) throw new Error("Expected a warm bundle");
    const legacy = JSON.parse(raw) as Record<string, unknown>;
    delete legacy.schemaVersion;
    delete legacy.roleFingerprint;
    legacy.dataScope = DataScope.ALL;
    legacy.permissions = [];
    cacheValues.set(bundleKey, JSON.stringify(legacy));
    expect(await authorize()).toMatchObject({
      dataScope: DataScope.SELF_ONLY,
      mayRead: true,
      mayRestore: false,
    });
  });

  it.each([false, true])(
    "a late cache write cannot reauthorize a disabled role (executionCtx=%s)",
    async (withExecutionContext) => {
      await addRole(10, { scope: DataScope.ALL });
      await bindRoles([10]);
      let release: (() => void) | undefined;
      let capture: (() => void) | undefined;
      const captured = new Promise<void>((resolve) => {
        capture = resolve;
      });
      const writeGate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let blockFirst = true;
      beforeCacheWrite = async (key) => {
        if (key !== bundleKey || !blockFirst) return;
        blockFirst = false;
        capture?.();
        await writeGate;
      };
      let oldRequestCompleted = false;
      const oldRequest = authorize(undefined, withExecutionContext).then(
        (result) => {
          oldRequestCompleted = true;
          return result;
        }
      );
      try {
        await captured;
        await db
          .update(roleTable)
          .set({ isEnabled: false, updateTimeUtc: 101 })
          .where(eq(roleTable.id, 10));
        expect((await authorize()).mayRead).toBe(false);
        if (withExecutionContext) await oldRequest;
        expect(oldRequestCompleted).toBe(withExecutionContext);
      } finally {
        release?.();
        await oldRequest;
        await settleBackgroundTasks();
      }
      const lateBundle = JSON.parse(cacheValues.get(bundleKey) ?? "null") as {
        dataScope: string;
      };
      expect(lateBundle.dataScope).toBe(DataScope.ALL);
      expect(await authorize()).toMatchObject({
        roleIds: [],
        dataScope: DataScope.SELF_ONLY,
        mayRead: false,
      });
    }
  );

  it("does not label old permissions with a global version that arrived during their query", async () => {
    await addRole(10);
    await bindRoles([10]);
    const readPermissions = registry.system.getPermissionsByRoleIds;
    vi.spyOn(registry.system, "getPermissionsByRoleIds").mockImplementationOnce(
      async (ids) => {
        const oldPermissions = await readPermissions(ids);
        await db
          .delete(rolePermissionTable)
          .where(eq(rolePermissionTable.roleId, 10));
        cacheValues.set(versionKey, "2");
        return oldPermissions;
      }
    );
    expect((await authorize()).mayRead).toBe(true);
    await settleBackgroundTasks();
    expect(JSON.parse(cacheValues.get(bundleKey) ?? "null")).toMatchObject({
      version: "1",
    });
    expect((await authorize()).mayRead).toBe(false);
  });

  it("falls back to database authorization without writing a guessed version when KV reads fail", async () => {
    await addRole(10, { scope: DataScope.CUSTOM, departments: [9] });
    await bindRoles([10]);
    failVersionRead = true;
    expect(await authorize()).toMatchObject({
      roleIds: [10],
      dataScope: DataScope.CUSTOM,
      customDeptIds: [9],
      mayRead: true,
    });
    await settleBackgroundTasks();
    expect(cacheValues.has(bundleKey)).toBe(false);
  });

  it("keeps valid authorization and reports a cache write failure without exposing its details", async () => {
    await addRole(10, { scope: DataScope.CUSTOM, departments: [9] });
    await bindRoles([10]);
    beforeCacheWrite = async () => {
      throw new Error("fixture-private-KV-detail");
    };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await authorize()).toMatchObject({
      roleIds: [10],
      dataScope: DataScope.CUSTOM,
      customDeptIds: [9],
      mayRead: true,
      mayRestore: false,
    });
    await settleBackgroundTasks();
    expect(cacheValues.has(bundleKey)).toBe(false);
    expect(errors).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ event: "auth.cache.write_failed", level: "error" })
    );
  });

  it("keeps API tokens independently scoped even when their creator has a disabled role", async () => {
    await addRole(1, { enabled: false, scope: DataScope.ALL });
    await bindRoles([1]);
    const roleLookup = vi.spyOn(registry.system, "getAuthorizationRoles");
    vi.spyOn(apiTokenRepository, "findByTokenHash").mockResolvedValue({
      id: 501,
      name: "isolated-test-token",
      tokenHash: "unused-fixture-hash",
      tokenPrefix: "hdr_fixture",
      permissions: JSON.stringify([`${resource}:read`]),
      ipWhitelist: null,
      startTimeUtc: null,
      expireTimeUtc: null,
      lastUsedTimeUtc: null,
      status: "active",
      remark: null,
      creatorId: userId,
      updaterId: null,
      createTimeUtc: 100,
      updateTimeUtc: null,
    });
    vi.spyOn(apiTokenRepository, "updateLastUsedTime").mockResolvedValue(
      undefined
    );
    expect(await authorize("hdr_isolated_disabled_role_fixture")).toMatchObject(
      {
        roleIds: [],
        isSuperAdmin: false,
        dataScope: DataScope.SELF_ONLY,
        mayRead: true,
        mayRestore: false,
        mayUseUnassignedAction: false,
      }
    );
    expect(roleLookup).not.toHaveBeenCalled();
    expect(cacheValues.has(bundleKey)).toBe(false);
  });
});
