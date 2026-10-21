import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq, sql } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import type { UserObj } from "@hodor/core/types/app";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import departmentSql from "@hodor/core/db/sql/admin/system_department.sql?raw";
import { roleTable } from "../role/model";
import { rolePermissionTable } from "./model";
import {
  RolePermissionRepository,
  rolePermissionRepository,
} from "./repository";
import { userRepository } from "../user/repository";
import roleService from "../role/service";
import { roleRepository } from "../role/repository";
import { RoleDeletionError } from "../role/errors";

vi.mock("@hodor/core/middleware/auth/cache-invalidation", () => ({
  invalidateAuthCache: vi.fn(),
}));
const actor = { userId: 101 } as UserObj;

async function addRole(id = 10, enabled = true) {
  await db.insert(roleTable).values({
    id,
    name: `role-${id}`,
    isEnabled: enabled,
    permissionCount: 0,
    dataScope: "all",
    creatorId: 101,
    isDeleted: false,
    deletedTimeUtc: null,
    deleterId: null,
  });
  return id;
}
async function rawRole(id: number) {
  const [row] = await db.select().from(roleTable).where(eq(roleTable.id, id));
  return row;
}
async function tombstone(id: number) {
  await db
    .update(roleTable)
    .set({ isDeleted: true, deletedTimeUtc: Date.now(), deleterId: 101 })
    .where(eq(roleTable.id, id));
}
const addUser = (name: string, roles: number[], isEnabled = false) =>
  userRepository.onInsert({
    username: name,
    password: "synthetic-test-hash",
    langCode: "zh-CN",
    roleIdArr: roles,
    isEnabled,
    creatorId: 101,
  });

describe("role references and atomic permission ownership", () => {
  beforeAll(async () =>
    setupTestDb(db, [
      roleSql,
      rolePermissionSql,
      permissionSql,
      userSql,
      departmentSql,
    ])
  );
  beforeEach(async () =>
    clearTestData(db, [
      "system_role_permission",
      "system_user",
      "system_role",
      "system_department",
      "system_permission",
    ])
  );
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.run(sql`DROP TRIGGER IF EXISTS test_reject_role_count`);
  });

  it("rejects missing/deleted roles in final user INSERT even without a department", async () => {
    await addRole();
    await tombstone(10);
    await expect(addUser("missing", [404])).rejects.toMatchObject({
      message: RoleDeletionError.NOT_ACTIVE,
    });
    await expect(addUser("deleted", [10])).rejects.toMatchObject({
      message: RoleDeletionError.NOT_ACTIVE,
    });
    expect(await db.all(sql`SELECT id FROM system_user`)).toEqual([]);
  });

  it("keeps disabled-role assignment policy and blocks deletion for disabled users until unbound", async () => {
    await addRole(10, false);
    const id = await addUser("disabled", [10]);
    await expect(
      roleService.delete.service({ id: 10 }, actor)
    ).rejects.toMatchObject({ message: RoleDeletionError.HAS_REFERENCES });
    await userRepository.onUpdate(id, { roleIdArr: [] });
    await roleService.delete.service({ id: 10 }, actor);
    await expect(
      userRepository.onUpdate(id, { roleIdArr: [10] })
    ).rejects.toMatchObject({ message: RoleDeletionError.NOT_ACTIVE });
    expect((await userRepository.findById(id))?.roleIdArr).toEqual([]);
  });

  it("serializes assignment versus deletion without a dangling active user reference", async () => {
    await addRole();
    const results = await Promise.allSettled([
      addUser("race", [10]),
      roleService.delete.service({ id: 10 }, actor),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      1
    );
    const role = await rawRole(10);
    const users = await db.all(sql`SELECT id FROM system_user`);
    expect(role.isDeleted ? users.length === 0 : users.length === 1).toBe(true);
  });

  it("atomically updates both owner counts and monotonic versions on reassignment", async () => {
    await addRole();
    await addRole(11);
    const id = await rolePermissionRepository.onInsert({
      roleId: 10,
      permissionId: 1,
      creatorId: 101,
    });
    const old = await rawRole(10);
    const next = await rawRole(11);
    await rolePermissionRepository.onUpdate(id, {
      roleId: 11,
      permissionId: 2,
      updaterId: 101,
    });
    expect((await rawRole(10)).permissionCount).toBe(0);
    expect((await rawRole(11)).permissionCount).toBe(1);
    expect((await rawRole(10)).updateTimeUtc).toBeGreaterThan(
      old.updateTimeUtc ?? 0
    );
    expect((await rawRole(11)).updateTimeUtc).toBeGreaterThan(
      next.updateTimeUtc ?? 0
    );
  });

  it("a stale deletion version cannot erase a role after permission configuration changed", async () => {
    await addRole();
    const before = await rawRole(10);
    await rolePermissionRepository.onInsert({
      roleId: 10,
      permissionId: 1,
      creatorId: 101,
    });
    await expect(
      roleRepository.onDeleteWithUndo(10, before.updateTimeUtc, actor.userId)
    ).rejects.toMatchObject({ message: RoleDeletionError.STATE_CONFLICT });
    expect((await rawRole(10)).isDeleted).toBe(false);
  });

  it("zero-row reassignment changes neither association nor owner count/version", async () => {
    await addRole();
    await addRole(11);
    const id = await rolePermissionRepository.onInsert({
      roleId: 10,
      permissionId: 1,
      creatorId: 101,
    });
    await tombstone(11);
    const beforeOld = await rawRole(10);
    const beforeNew = await rawRole(11);
    await expect(
      rolePermissionRepository.onUpdate(id, { roleId: 11 })
    ).rejects.toMatchObject({ message: RoleDeletionError.STATE_CONFLICT });
    expect((await rolePermissionRepository.findById(id))?.roleId).toBe(10);
    expect(await rawRole(10)).toEqual(beforeOld);
    expect(await rawRole(11)).toEqual(beforeNew);
  });

  it("guards the actual old owner even when a permission-only edit races deletion", async () => {
    await addRole();
    const id = await rolePermissionRepository.onInsert({
      roleId: 10,
      permissionId: 1,
      creatorId: 101,
    });
    const repository = new RolePermissionRepository();
    const current = await repository.findById(id);
    vi.spyOn(repository, "findById").mockImplementationOnce(async () => {
      await tombstone(10);
      return current;
    });
    const before = await rawRole(10);
    await expect(
      repository.onUpdate(id, { permissionId: 2 })
    ).rejects.toMatchObject({ message: RoleDeletionError.STATE_CONFLICT });
    const [binding] = await db
      .select()
      .from(rolePermissionTable)
      .where(eq(rolePermissionTable.id, id));
    expect(binding.permissionId).toBe(1);
    expect((await rawRole(10)).permissionCount).toBe(before.permissionCount);
    expect((await rawRole(10)).updateTimeUtc).toBe(before.updateTimeUtc);
  });

  it("retains bindings but hides normal association reads and authorization for deleted roles", async () => {
    await addRole();
    const id = await rolePermissionRepository.onInsert({
      roleId: 10,
      permissionId: 1,
      creatorId: 101,
    });
    await tombstone(10);
    expect(await rolePermissionRepository.findById(id)).toBeNull();
    expect(await rolePermissionRepository.findAll({ roleId: 10 })).toEqual([]);
    expect(
      await rolePermissionRepository.getPermissionsByRoleIds([10])
    ).toEqual([]);
    await expect(
      rolePermissionRepository.onInsert({
        roleId: 10,
        permissionId: 2,
        creatorId: 101,
      })
    ).rejects.toThrow();
    await expect(rolePermissionRepository.onDelete(id)).rejects.toThrow();
    expect(await db.select().from(rolePermissionTable)).toHaveLength(1);
  });

  it("bulk operations avoid parameter limits and zero-row removal leaves versions unchanged", async () => {
    await addRole();
    const ids = Array.from({ length: 150 }, (_, index) => index + 1);
    expect(
      await rolePermissionRepository.onBatchInsert(
        ids.map((permissionId) => ({
          roleId: 10,
          permissionId,
          creatorId: 101,
        }))
      )
    ).toBe(150);
    expect((await rawRole(10)).permissionCount).toBe(150);
    const before = await rawRole(10);
    expect(await rolePermissionRepository.onBatchDelete(10, [999])).toBe(0);
    expect(await rawRole(10)).toEqual(before);
    expect(await rolePermissionRepository.onBatchDelete(10, ids)).toBe(150);
    expect((await rawRole(10)).permissionCount).toBe(0);
  });

  it("rolls back association changes when the owner-count statement fails", async () => {
    await addRole();
    const before = await rawRole(10);
    await db.run(
      sql`CREATE TRIGGER test_reject_role_count BEFORE UPDATE OF permission_count ON system_role BEGIN SELECT RAISE(ABORT, 'synthetic count failure'); END`
    );
    await expect(
      rolePermissionRepository.onInsert({
        roleId: 10,
        permissionId: 1,
        creatorId: 101,
      })
    ).rejects.toThrow();
    expect(await db.select().from(rolePermissionTable)).toEqual([]);
    expect(await rawRole(10)).toEqual(before);
  });
});
