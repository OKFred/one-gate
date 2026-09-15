import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import { eq } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import { KVStorage } from "@hodor/core/middleware/cache";
import { DataScope, type DataScopeValue } from "@hodor/core/types/dataScope";
import type { UserObj } from "@hodor/core/types/app";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import { roleRepository } from "../role/repository";
import { roleTable } from "../role/model";
import roleService, { utils as roleUtils } from "../role/service";
import { ErrorCodes } from "../role/prevention";
import { permissionTable } from "../permission/model";
import { rolePermissionRepository } from "../role_permission/repository";
import rolePermissionService, {
  getPermissionsByRoleIds,
} from "../role_permission/service";
import { userTable } from "../user/model";
import userService from "../user/service";

const now = 1_800_000_000_000;
const actor: UserObj = {
  id: 900,
  userId: 900,
  username: "authorization-test-actor",
  langCode: "en-US",
  isEnabled: true,
  token: "local-test-only",
  isSuperAdmin: true,
  roleIds: [1],
  permissions: [],
  dataScope: DataScope.ALL,
  customDeptIds: [],
  async ensureLoaded() {},
};

async function seedRole(
  id: number,
  options: {
    isEnabled?: boolean;
    dataScope?: DataScopeValue;
    customDeptIds?: string | null;
    updateTimeUtc?: number | null;
  } = {}
) {
  await db.insert(roleTable).values({
    id,
    name: "role-" + id,
    remark: "Management-only role detail",
    isEnabled: options.isEnabled ?? true,
    dataScope: options.dataScope ?? DataScope.SELF_ONLY,
    customDeptIds: options.customDeptIds ?? null,
    permissionCount: 0,
    creatorId: actor.userId,
    createTimeUtc: now,
    updateTimeUtc: options.updateTimeUtc ?? null,
  });
}

async function seedPermission(id: number, isEnabled = true) {
  await db.insert(permissionTable).values({
    id,
    code: "authorization-test:permission-" + id,
    name: "Permission " + id,
    category: "action",
    resource: null,
    business: "authorization-test",
    remark: null,
    isEnabled,
    creatorId: actor.userId,
    createTimeUtc: now,
  });
}

async function grant(roleId: number, permissionId: number) {
  await rolePermissionRepository.onInsert({
    roleId,
    permissionId,
    creatorId: actor.userId,
  });
}

describe("enabled role authorization repository and service boundaries", () => {
  let cacheWriteSpy: MockInstance<KVStorage["put"]>;

  beforeAll(async () => {
    await setupTestDb(db, [roleSql, permissionSql, rolePermissionSql, userSql]);
  });

  beforeEach(async () => {
    await clearTestData(db, [
      "system_role_permission",
      "system_permission",
      "system_user",
      "system_role",
    ]);
    cacheWriteSpy = vi
      .spyOn(KVStorage.prototype, "put")
      .mockResolvedValue(undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns only requested enabled roles, sorted and without management-only fields", async () => {
    await seedRole(7, {
      dataScope: DataScope.CUSTOM,
      customDeptIds: "[21,22]",
      updateTimeUtc: 42,
    });
    await seedRole(2, { dataScope: DataScope.ALL });
    await seedRole(4, { isEnabled: false, dataScope: DataScope.ALL });
    await seedRole(99);

    expect(await roleUtils.getAuthorizationRoles([7, 4, 404, 2, 7])).toEqual([
      {
        id: 2,
        dataScope: DataScope.ALL,
        customDeptIds: null,
        updateTimeUtc: null,
      },
      {
        id: 7,
        dataScope: DataScope.CUSTOM,
        customDeptIds: "[21,22]",
        updateTimeUtc: 42,
      },
    ]);
  });

  it("returns no authorization for empty or nonexistent role IDs", async () => {
    await seedRole(2);
    expect(await roleRepository.getAuthorizationRoles([])).toEqual([]);
    expect(await roleRepository.getAuthorizationRoles([404])).toEqual([]);
    expect(await roleUtils.getRoleDataScopes([])).toEqual([]);
    expect(await roleUtils.getRoleDataScopes([404])).toEqual([]);
    expect(await rolePermissionRepository.getPermissionsByRoleIds([])).toEqual(
      []
    );
    expect(await getPermissionsByRoleIds([])).toEqual([]);
    expect(await getPermissionsByRoleIds([404])).toEqual([]);
  });

  it.each([DataScope.ALL, DataScope.CUSTOM])(
    "does not return a disabled role's %s scope",
    async (dataScope) => {
      await seedRole(2, { dataScope: DataScope.DEPT_AND_BELOW });
      await seedRole(3, {
        isEnabled: false,
        dataScope,
        customDeptIds: dataScope === DataScope.CUSTOM ? "[31,32]" : null,
      });
      expect(await roleUtils.getRoleDataScopes([3, 2])).toEqual([
        { dataScope: DataScope.DEPT_AND_BELOW, customDeptIds: null },
      ]);
    }
  );

  it("keeps disabled roles in user and role management DTOs and binding validation", async () => {
    await seedRole(2);
    await seedRole(3, { isEnabled: false });
    await db.insert(userTable).values({
      id: 21,
      username: "role-binding-fixture",
      password: "test-only-password-hash",
      langCode: "en-US",
      regionId: null,
      departmentId: null,
      roleIdArr: [2, 3],
      isEnabled: true,
      creatorId: actor.userId,
      createTimeUtc: now,
    });
    expect((await userService.get.service({ id: 21 })).roleArr).toEqual([
      { value: 2, label: "role-2" },
      { value: 3, label: "role-3" },
    ]);
    await expect(roleUtils.verifyRoles([2, 3])).resolves.toBeUndefined();
    expect((await roleService.get.service({ id: 3 }))?.isEnabled).toBe(false);
    expect(
      (await roleService.listAll.service({})).map((role) => role.id).sort()
    ).toEqual([2, 3]);
    expect(
      (await roleUtils.getAuthorizationRoles([2, 3])).map((role) => role.id)
    ).toEqual([2]);
  });

  it("joins enabled roles and permissions in the ordinary permission query", async () => {
    await seedRole(2);
    await seedRole(3, { isEnabled: false });
    await seedPermission(10);
    await seedPermission(11);
    await seedPermission(12, false);
    await seedPermission(13);
    await grant(2, 10);
    await grant(3, 10);
    await grant(3, 11);
    await grant(2, 12);
    await grant(404, 13);
    expect(
      (await rolePermissionRepository.getPermissionsByRoleIds([2, 3, 404])).map(
        (permission) => permission.id
      )
    ).toEqual([10]);
  });

  it("does not use the capped role-management list for ordinary authorization", async () => {
    await seedRole(10_002);
    await seedRole(3, { isEnabled: false });
    await seedPermission(10);
    await seedPermission(11);
    await grant(10_002, 10);
    await grant(3, 11);
    const managementList = vi
      .spyOn(roleRepository, "findAll")
      .mockRejectedValue(
        new Error("Management lists must not serve authorization")
      );
    expect(
      (await getPermissionsByRoleIds([3, 10_002])).map(
        (permission) => permission.id
      )
    ).toEqual([10]);
    expect(managementList).not.toHaveBeenCalled();
  });

  it("rejects a role disabled after its authorization ID snapshot was read", async () => {
    await seedRole(2);
    await seedPermission(10);
    await grant(2, 10);
    const roleIds = (await roleUtils.getAuthorizationRoles([2])).map(
      (role) => role.id
    );
    await roleService.update.service({ id: 2, isEnabled: false }, actor);
    expect(
      await rolePermissionRepository.getPermissionsByRoleIds(roleIds)
    ).toEqual([]);
    expect(await getPermissionsByRoleIds(roleIds)).toEqual([]);
  });

  it("restores ordinary authorization after re-enabling and invalidates cache for both changes", async () => {
    await seedRole(2, { dataScope: DataScope.ALL });
    await seedPermission(10);
    await grant(2, 10);
    expect(
      (await getPermissionsByRoleIds([2])).map((permission) => permission.id)
    ).toEqual([10]);
    await roleService.update.service({ id: 2, isEnabled: false }, actor);
    expect(await roleUtils.getAuthorizationRoles([2])).toEqual([]);
    expect(await getPermissionsByRoleIds([2])).toEqual([]);
    await roleService.update.service({ id: 2, isEnabled: true }, actor);
    expect(
      (await getPermissionsByRoleIds([2])).map((permission) => permission.id)
    ).toEqual([10]);
    expect(await roleUtils.getRoleDataScopes([2])).toEqual([
      { dataScope: DataScope.ALL, customDeptIds: null },
    ]);
    const cacheWrites = cacheWriteSpy.mock.calls;
    expect(cacheWrites).toHaveLength(2);
    expect(
      cacheWrites.every(
        ([key, value]) =>
          key === "system.auth:global_version" && typeof value === "string"
      )
    ).toBe(true);
    expect(cacheWrites[0][1]).not.toBe(cacheWrites[1][1]);
  });

  it("retains the existing enabled super-admin permission shortcut", async () => {
    await seedRole(1, { dataScope: DataScope.ALL });
    await seedPermission(10);
    await seedPermission(11, false);
    expect(
      (await getPermissionsByRoleIds([1]))
        .map((permission) => permission.id)
        .sort()
    ).toEqual([10, 11]);
  });

  it.each(["missing", "disabled"] as const)(
    "fails safely for a %s role 1 while preserving enabled ordinary roles",
    async (state) => {
      if (state === "disabled")
        await seedRole(1, { isEnabled: false, dataScope: DataScope.ALL });
      await seedRole(2);
      await seedPermission(10);
      await seedPermission(11);
      await grant(2, 10);
      await grant(1, 11);
      expect(await roleUtils.getAuthorizationRoles([1])).toEqual([]);
      expect(await getPermissionsByRoleIds([1])).toEqual([]);
      expect(
        (await getPermissionsByRoleIds([1, 2])).map(
          (permission) => permission.id
        )
      ).toEqual([10]);
    }
  );

  it("keeps configured permissions readable when managing a disabled role", async () => {
    await seedRole(3, { isEnabled: false });
    await seedPermission(10);
    await grant(3, 10);
    expect(
      (
        await rolePermissionService.getPermissionsByRole.service({ roleId: 3 })
      ).map((permission) => permission.id)
    ).toEqual([10]);
    expect(await getPermissionsByRoleIds([3])).toEqual([]);
  });

  it("keeps the existing prohibition on disabling role 1 through role management", async () => {
    await seedRole(1, { dataScope: DataScope.ALL });
    await expect(
      roleService.update.service({ id: 1, isEnabled: false }, actor)
    ).rejects.toMatchObject({ code: ErrorCodes.SUPER_ADMIN_UPDATE });
    expect((await roleRepository.findById(1))?.isEnabled).toBe(true);
    expect(
      (await roleUtils.getAuthorizationRoles([1])).map((role) => role.id)
    ).toEqual([1]);
    expect(cacheWriteSpy).not.toHaveBeenCalled();
  });

  it("advances the authorization timestamp through disable and re-enable within one millisecond", async () => {
    await seedRole(2);
    vi.spyOn(Date, "now").mockReturnValue(now);
    await roleService.update.service({ id: 2, remark: "first version" }, actor);
    const before = await roleUtils.getAuthorizationRoles([2]);
    expect(before[0].updateTimeUtc).toBe(now);
    await roleService.update.service({ id: 2, isEnabled: false }, actor);
    expect((await roleRepository.findById(2))?.updateTimeUtc).toBe(now + 1);
    expect(await roleUtils.getAuthorizationRoles([2])).toEqual([]);
    await roleService.update.service({ id: 2, isEnabled: true }, actor);
    const after = await roleUtils.getAuthorizationRoles([2]);
    expect(after[0].updateTimeUtc).toBe(now + 2);
    expect(after).not.toEqual(before);
  });

  it("advances a previous timestamp when the clock moves backwards", async () => {
    await seedRole(2, { updateTimeUtc: now + 50 });
    vi.spyOn(Date, "now").mockReturnValue(now);
    await roleRepository.onUpdate(2, { isEnabled: false });
    await roleRepository.onUpdate(2, { isEnabled: true });
    const [row] = await db.select().from(roleTable).where(eq(roleTable.id, 2));
    expect(row.updateTimeUtc).toBe(now + 52);
  });
});
