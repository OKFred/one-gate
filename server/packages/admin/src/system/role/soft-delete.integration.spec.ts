import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql, eq } from "drizzle-orm";
import { Validator } from "@cfworker/json-schema";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import {
  SOFT_DELETE_RETENTION_MS,
  SOFT_DELETE_UNDO_WINDOW_MS,
} from "@hodor/core/db/soft-delete";
import {
  RecycleBinRegistry,
  RecycleBinUndoError,
} from "@hodor/core/db/recycle-bin";
import { BusinessErrorCode } from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import departmentSql from "@hodor/core/db/sql/admin/system_department.sql?raw";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import {
  RoleRepository,
  roleRepository,
  purgeExpiredRoles,
} from "./repository";
import { roleTable } from "./model";
import { RoleDeletionError } from "./errors";
import { ErrorCodes } from "./prevention";
import service, { restoreDeletedRole, undoDeletedRole } from "./service";
import { roleRecycleBinAdapter } from "./recycle-bin";
import { createRecycleBinHandlers } from "../../maintenance/recycle-bin/service";
import { departmentRepository } from "../department/repository";
import { departmentTable } from "../department/model";
import { DepartmentDeletionError } from "../department/errors";
import { userTable } from "../user/model";

const dependencies = vi.hoisted(() => ({ invalidateAuthCache: vi.fn() }));
vi.mock("@hodor/core/middleware/auth/cache-invalidation", () => dependencies);

const start = 1_800_000_000_000;
const deleteCode = "admin.system.role:delete";
const clockSql = () =>
  sql`(SELECT time_utc FROM test_role_soft_delete_clock WHERE id = 1)`;
const repository = new RoleRepository(clockSql);
const registry = new RecycleBinRegistry();
registry.register(roleRecycleBinAdapter);
const handlers = createRecycleBinHandlers(registry);

function actor(
  userId = 101,
  codes = [deleteCode],
  isSuperAdmin = false
): UserObj {
  return {
    id: userId,
    userId,
    username: "role-fixture",
    langCode: "en-US",
    isEnabled: true,
    token: "test-only",
    isSuperAdmin,
    roleIds: [],
    dataScope: "all",
    customDeptIds: [],
    ensureLoaded: async () => undefined,
    permissions: codes.map((code, index) => ({
      id: index + 1,
      code,
      name: code,
      category: "action",
      resource: null,
      business: null,
      remark: null,
      isEnabled: true,
      creatorId: userId,
      updaterId: null,
      createTimeUtc: 1,
      updateTimeUtc: null,
    })),
  };
}
async function setClock(now: number) {
  await db.run(
    sql`UPDATE test_role_soft_delete_clock SET time_utc = ${now} WHERE id = 1`
  );
}
function add(
  name = "role",
  customDeptIds: string | null = null,
  isEnabled = false
) {
  return repository.onInsert({
    name,
    remark: "saved configuration",
    isEnabled,
    permissionCount: 0,
    dataScope: customDeptIds ? "custom" : "self_only",
    customDeptIds,
    creatorId: 101,
    isDeleted: false,
    deletedTimeUtc: null,
    deleterId: null,
  });
}
function remove(
  id: number,
  expectedUpdateTimeUtc: number | null = null,
  user = actor()
) {
  return service.deleteWithUndo.service({ id, expectedUpdateTimeUtc }, user);
}
function undo(id: number, user = actor(), expectedDeletedTimeUtc = start) {
  return handlers.onUndo(
    { resourceType: "role", id, expectedDeletedTimeUtc },
    user
  );
}
async function bind(roleId: number, permissionId = 77) {
  await db.run(
    sql`INSERT INTO system_role_permission (role_id, permission_id, creator_id, create_time_utc) VALUES (${roleId}, ${permissionId}, 101, ${start})`
  );
}
async function bindings(roleId: number) {
  return db.all<{ id: number; permission_id: number }>(
    sql`SELECT id, permission_id FROM system_role_permission WHERE role_id = ${roleId} ORDER BY id`
  );
}
async function addUser(roleIdArr: number[], isEnabled = false) {
  return db
    .insert(userTable)
    .values({
      username: "referencing-user",
      password: "test-hash",
      langCode: "en-US",
      isEnabled,
      roleIdArr,
      creatorId: 101,
      createTimeUtc: start,
    })
    .returning({ id: userTable.id });
}

describe("role soft deletion, recovery and atomic configuration cleanup", () => {
  beforeAll(async () => {
    await setupTestDb(db, [
      departmentSql,
      userSql,
      roleSql,
      permissionSql,
      rolePermissionSql,
    ]);
    await db.run(
      sql`CREATE TABLE IF NOT EXISTS test_role_soft_delete_clock (id INTEGER PRIMARY KEY, time_utc INTEGER NOT NULL)`
    );
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.run(sql`DROP TRIGGER IF EXISTS test_role_purge_failure`);
    await clearTestData(db, [
      "system_role_permission",
      "system_permission",
      "system_department",
      "system_user",
      "system_role",
      "test_role_soft_delete_clock",
    ]);
    await db.run(
      sql`INSERT INTO test_role_soft_delete_clock VALUES (1, ${start})`
    );
    await db.insert(roleTable).values({
      id: 1,
      name: "protected",
      isEnabled: true,
      permissionCount: 0,
      dataScope: "all",
      creatorId: 1,
      createTimeUtc: 1,
      isDeleted: false,
      deletedTimeUtc: null,
      deleterId: null,
    });
    vi.spyOn(roleRepository, "onDelete").mockImplementation(
      repository.onDelete.bind(repository)
    );
    vi.spyOn(roleRepository, "onDeleteWithUndo").mockImplementation(
      repository.onDeleteWithUndo.bind(repository)
    );
    vi.spyOn(roleRepository, "findUndoState").mockImplementation(
      repository.findUndoState.bind(repository)
    );
    vi.spyOn(roleRepository, "undoDelete").mockImplementation(
      repository.undoDelete.bind(repository)
    );
    vi.spyOn(roleRepository, "restore").mockImplementation(
      repository.restore.bind(repository)
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("rejects ordinary request injection and requires a nullable page version", () => {
    const addValidator = new Validator(service.add.req);
    const updateValidator = new Validator(service.update.req);
    for (const field of ["isDeleted", "deletedTimeUtc", "deleterId"]) {
      expect(
        addValidator.validate({
          name: "injected",
          remark: null,
          isEnabled: true,
          dataScope: "all",
          customDeptIds: null,
          [field]: 1,
        }).valid
      ).toBe(false);
      expect(updateValidator.validate({ id: 2, [field]: 1 }).valid).toBe(false);
    }
    const validator = new Validator(service.deleteWithUndo.req);
    expect(
      validator.validate({ id: 2, expectedUpdateTimeUtc: null }).valid
    ).toBe(true);
    for (const invalid of [
      { id: 2 },
      { id: 2, expectedUpdateTimeUtc: -1 },
      { id: 2, expectedUpdateTimeUtc: 1.5 },
      { id: 2, expectedUpdateTimeUtc: null, now: start },
    ])
      expect(validator.validate(invalid).valid).toBe(false);
  });

  it("retains disabled state and bindings, hides every ordinary role read, and keeps the old numeric delete response", async () => {
    const id = await add("hidden", null, true);
    await bind(id);
    expect(await service.delete.service({ id }, actor())).toBe(id);
    expect(await repository.findDeletedById(id)).toMatchObject({
      id,
      isDeleted: true,
      isEnabled: true,
      remark: "saved configuration",
      deleterId: 101,
      deletedTimeUtc: start,
    });
    expect(await bindings(id)).toHaveLength(1);
    expect(await repository.findById(id)).toBeNull();
    expect(await repository.findAll({ keyword: "hidden" })).toEqual([]);
    expect(
      await repository.findPage({ keyword: "hidden", pageNo: 1, pageSize: 10 })
    ).toEqual({ total: 0, list: [] });
    expect(await repository.getRolesByIds([id])).toEqual([]);
    expect(await repository.getRoleDataScopes([id])).toEqual([]);
    expect(await repository.getAuthorizationRoles([id])).toEqual([]);
    expect(await repository.verifyRoleExists(id)).toBe(false);
    await expect(
      repository.onUpdate(id, { name: "changed" })
    ).rejects.toMatchObject({ code: RoleDeletionError.NOT_ACTIVE });
    await expect(service.get.service({ id })).rejects.toThrow();
    expect(dependencies.invalidateAuthCache).toHaveBeenCalled();
  });

  it("exposes updateTimeUtc and produces the exact SQL receipt without trusting the JavaScript clock", async () => {
    const id = await add("receipt");
    const original = (await service.listAll.service({})).find(
      (row) => row.id === id
    );
    expect(original?.updateTimeUtc).toBeNull();
    vi.spyOn(Date, "now").mockReturnValue(1);
    const receipt = await remove(id);
    expect(receipt).toEqual({
      resourceType: "role",
      id,
      expectedDeletedTimeUtc: start,
      serverTimeUtc: start,
      undoExpiresTimeUtc: start + SOFT_DELETE_UNDO_WINDOW_MS,
    });
    expect(
      new Validator(service.deleteWithUndo.res).validate(receipt).valid
    ).toBe(true);
  });

  it("protects the super administrator in service and all final delete/purge SQL", async () => {
    await expect(remove(1)).rejects.toMatchObject({
      code: ErrorCodes.SUPER_ADMIN_DELETE,
    });
    await expect(repository.onDelete(1, 101)).rejects.toMatchObject({
      code: ErrorCodes.SUPER_ADMIN_DELETE,
    });
    await bind(1);
    await db
      .update(roleTable)
      .set({ isDeleted: true, deletedTimeUtc: start, deleterId: 101 })
      .where(eq(roleTable.id, 1));
    expect(await repository.purge(1, start)).toBeNull();
    expect(
      await purgeExpiredRoles({
        now: start + SOFT_DELETE_RETENTION_MS,
        batchSize: 100,
      })
    ).toMatchObject({ deletedCount: 0 });
    expect(await bindings(1)).toHaveLength(1);
  });

  it("blocks disabled user references and permits deletion after explicit unbinding", async () => {
    const id = await add();
    const [user] = await addUser([id], false);
    await expect(remove(id)).rejects.toMatchObject({
      code: RoleDeletionError.HAS_REFERENCES,
    });
    await db
      .update(userTable)
      .set({ roleIdArr: [] })
      .where(eq(userTable.id, user.id));
    expect((await remove(id)).id).toBe(id);
  });

  it.each(["broken", "null", "{}", '["2"]', "[-2]", "[9007199254740992]"])(
    "fails closed for invalid user reference JSON %s",
    async (value) => {
      const id = await add();
      const [user] = await addUser([]);
      await db.run(
        sql`UPDATE system_user SET role_id_arr = ${value} WHERE id = ${user.id}`
      );
      await expect(remove(id)).rejects.toMatchObject({
        code: RoleDeletionError.HAS_REFERENCES,
      });
      expect(await repository.findById(id)).not.toBeNull();
    }
  );

  it("requires the deleter and current delete permission without recycle restore/read/edit permission", async () => {
    const id = await add();
    await remove(id);
    await expect(undo(id, actor(102))).rejects.toMatchObject({
      code: RecycleBinUndoError.FORBIDDEN,
    });
    await expect(undo(id, actor(101, []))).rejects.toMatchObject({
      code: RecycleBinUndoError.FORBIDDEN,
    });
    await setClock(start + 14_999);
    expect(await undo(id)).toBe(id);
    expect(await repository.findById(id)).toMatchObject({ isEnabled: false });
    const raw = await db.select().from(roleTable).where(eq(roleTable.id, id));
    expect(raw[0]).toMatchObject({
      isDeleted: false,
      deletedTimeUtc: null,
      deleterId: null,
    });
  });

  it("requires both recycle restoration permission and role edit permission", async () => {
    const id = await add("permission matrix");
    await remove(id);
    const input = { resourceType: "role", id, expectedDeletedTimeUtc: start };
    for (const codes of [
      ["admin.system.role:edit"],
      ["admin.maintenance.recycle_bin:restore"],
      [deleteCode],
    ]) {
      await expect(
        handlers.onRestore(input, actor(102, codes))
      ).rejects.toMatchObject({ code: BusinessErrorCode.PERMISSION_DENIED });
    }
    expect(
      await handlers.onRestore(
        input,
        actor(102, [
          "admin.system.role:edit",
          "admin.maintenance.recycle_bin:restore",
        ])
      )
    ).toBe(id);
  });

  it("advertises role resources only with role and recycle read permissions", async () => {
    await expect(
      handlers.onResources({}, actor(101, ["admin.system.role:read"]))
    ).rejects.toMatchObject({ code: BusinessErrorCode.PERMISSION_DENIED });
    expect(
      await handlers.onResources(
        {},
        actor(101, ["admin.maintenance.recycle_bin:read"])
      )
    ).toEqual({ list: [] });
    expect(
      await handlers.onResources(
        {},
        actor(101, [
          "admin.maintenance.recycle_bin:read",
          "admin.system.role:read",
          "admin.system.role:edit",
          "admin.maintenance.recycle_bin:restore",
        ])
      )
    ).toEqual({
      list: [
        {
          resourceType: "role",
          labelKey: "businessType.admin.system.role",
          canRestore: true,
          canPurge: false,
        },
      ],
    });
  });

  it("rejects undo at exactly 15 seconds and checks expiration when the SQL executes", async () => {
    const id = await add();
    await remove(id);
    await setClock(start + 15_000);
    await expect(undo(id)).rejects.toMatchObject({
      code: RecycleBinUndoError.EXPIRED,
    });
    await setClock(start + 14_999);
    vi.spyOn(roleRepository, "undoDelete").mockImplementation(
      async (...args) => {
        await setClock(start + 15_000);
        return repository.undoDelete(...args);
      }
    );
    await expect(undo(id)).rejects.toMatchObject({
      code: RecycleBinUndoError.EXPIRED,
    });
    expect(await repository.findDeletedById(id)).not.toBeNull();
  });

  it("allows 30-day restore only before the exact deadline and does not renew repeated deletion", async () => {
    const id = await add();
    await remove(id);
    await setClock(start + 100);
    await expect(remove(id)).rejects.toMatchObject({
      code: RoleDeletionError.NOT_ACTIVE,
    });
    expect((await repository.findDeletedById(id))?.deletedTimeUtc).toBe(start);
    await setClock(start + SOFT_DELETE_RETENTION_MS);
    await expect(restoreDeletedRole(id, start, 102)).rejects.toMatchObject({
      code: RoleDeletionError.EXPIRED,
    });
    await setClock(start + SOFT_DELETE_RETENTION_MS - 1);
    expect(await restoreDeletedRole(id, start, 102)).toBe(id);
  });

  it("uses database execution time for queued 30-day restoration", async () => {
    const id = await add();
    await remove(id);
    await setClock(start + SOFT_DELETE_RETENTION_MS - 1);
    vi.spyOn(roleRepository, "restore").mockImplementation(async (...args) => {
      await setClock(start + SOFT_DELETE_RETENTION_MS);
      return repository.restore(...args);
    });
    await expect(restoreDeletedRole(id, start, 102)).rejects.toMatchObject({
      code: RoleDeletionError.EXPIRED,
    });
  });

  it("keeps failed name recovery retryable under the original deletion version", async () => {
    const id = await add("reused");
    await remove(id);
    const replacement = await add("reused");
    await expect(undo(id)).rejects.toMatchObject({
      code: RoleDeletionError.NAME_CONFLICT,
    });
    await repository.onUpdate(replacement, { name: "replacement" });
    expect(await undo(id)).toBe(id);
  });

  it("ignores deleted role ranges for department soft deletion, but blocks permanent purge and role recovery", async () => {
    const departmentId = await departmentRepository.onInsert({
      name: "scoped",
      parentId: null,
      remark: null,
      isEnabled: false,
      creatorId: 101,
      isDeleted: false,
      deletedTimeUtc: null,
      deleterId: null,
    });
    const id = await add("scoped role", JSON.stringify([departmentId]));
    await expect(
      departmentRepository.onDelete(departmentId, 101, start)
    ).rejects.toMatchObject({ code: DepartmentDeletionError.HAS_REFERENCES });
    await remove(id);
    await departmentRepository.onDelete(departmentId, 101, start);
    expect(await departmentRepository.purge(departmentId, start)).toBeNull();
    await expect(undo(id)).rejects.toMatchObject({
      code: RoleDeletionError.DEPARTMENTS_UNAVAILABLE,
    });
    await db
      .update(departmentTable)
      .set({ isDeleted: false, deletedTimeUtc: null, deleterId: null })
      .where(eq(departmentTable.id, departmentId));
    expect(await undo(id)).toBe(id);
  });

  it("fails closed for malformed stored custom department ranges", async () => {
    const id = await add();
    await remove(id);
    await db.run(
      sql`UPDATE system_role SET custom_dept_ids = 'broken' WHERE id = ${id}`
    );
    await expect(undo(id)).rejects.toMatchObject({
      code: RoleDeletionError.DEPARTMENTS_UNAVAILABLE,
    });
    expect(await repository.undoDelete(id, start, 101)).toBeNull();
  });

  it("rejects an unsafe saved department ID even when the legacy department exists", async () => {
    const id = await add("unsafe saved scope");
    await remove(id);
    const [sequence] = await db.all<{ seq: number }>(
      sql`SELECT seq FROM sqlite_sequence WHERE name = 'system_department'`
    );
    const unsafeId = Number.MAX_SAFE_INTEGER + 1;
    try {
      await db.run(sql`INSERT INTO system_department (id, name, is_enabled, creator_id, create_time_utc, is_deleted, deleted_time_utc, deleter_id)
        VALUES (${unsafeId}, 'unsafe legacy department', 1, 101, ${start}, 0, NULL, NULL)`);
      await db.run(
        sql`UPDATE system_role SET custom_dept_ids = ${JSON.stringify([unsafeId])} WHERE id = ${id}`
      );
      await expect(undo(id)).rejects.toMatchObject({
        code: RoleDeletionError.DEPARTMENTS_UNAVAILABLE,
      });
      expect(await repository.restore(id, start, 102)).toBeNull();
    } finally {
      await db.run(sql`DELETE FROM system_department WHERE id = ${unsafeId}`);
      await db.run(
        sql`UPDATE sqlite_sequence SET seq = ${sequence?.seq ?? 0} WHERE name = 'system_department'`
      );
    }
  });

  it("restores the original binding IDs and recomputes their count in the same SQL", async () => {
    const id = await add();
    await bind(id, 11);
    await bind(id, 12);
    const original = await bindings(id);
    await remove(id);
    await db
      .update(roleTable)
      .set({ permissionCount: 999 })
      .where(eq(roleTable.id, id));
    expect(await undo(id)).toBe(id);
    expect((await repository.findById(id))?.permissionCount).toBe(2);
    expect(await bindings(id)).toEqual(original);
  });

  it("rejects stale page versions, clock conflicts and old deletion receipts after a second deletion", async () => {
    const id = await add();
    await db
      .update(roleTable)
      .set({ updateTimeUtc: start - 1 })
      .where(eq(roleTable.id, id));
    await expect(remove(id)).rejects.toMatchObject({
      code: RoleDeletionError.STATE_CONFLICT,
    });
    await db
      .update(roleTable)
      .set({ updateTimeUtc: start })
      .where(eq(roleTable.id, id));
    await expect(remove(id, start)).rejects.toMatchObject({
      code: RoleDeletionError.CLOCK_CONFLICT,
    });
    await setClock(start + 1);
    await remove(id, start);
    await setClock(start + 2);
    expect(await undo(id, actor(), start + 1)).toBe(id);
    await setClock(start + 3);
    await remove(id, start + 2);
    await expect(undo(id, actor(), start + 1)).rejects.toMatchObject({
      code: RoleDeletionError.STALE_DELETION,
    });
    expect(await repository.purge(id, start + 1)).toBeNull();
  });

  it("does not infer deletion outcome from missing records or recover a response-loss retry twice", async () => {
    const id = await add();
    await remove(id);
    vi.spyOn(roleRepository, "undoDelete").mockImplementation(
      async (...args) => {
        await repository.undoDelete(...args);
        throw new Error("synthetic response loss");
      }
    );
    await expect(undo(id)).rejects.toThrow("synthetic response loss");
    expect(await repository.findById(id)).not.toBeNull();
    await expect(undo(id)).rejects.toMatchObject({
      code: RoleDeletionError.NOT_DELETED,
    });
    await expect(undo(999)).rejects.toMatchObject({
      code: RoleDeletionError.NOT_DELETED,
    });
  });

  it("requires actual super administrator identity for early purge and validates numeric IDs", async () => {
    const id = await add();
    await remove(id);
    await expect(
      roleRecycleBinAdapter.purge(
        { id, expectedDeletedTimeUtc: start },
        actor(101, [deleteCode, "admin.maintenance.recycle_bin:purge"])
      )
    ).rejects.toMatchObject({ code: BusinessErrorCode.PERMISSION_DENIED });
    expect(() =>
      roleRecycleBinAdapter.undo?.(
        { id: String(id), expectedDeletedTimeUtc: start },
        actor()
      )
    ).toThrow(BusinessErrorCode.INVALID_PARAMS);
    expect(
      await roleRecycleBinAdapter.purge(
        { id, expectedDeletedTimeUtc: start },
        actor(101, [], true)
      )
    ).toBe(id);
  });

  it("purges empty configuration, exact versions and referenced roles without detached binding changes", async () => {
    const empty = await add("empty");
    await remove(empty);
    expect(await repository.purge(empty, start)).toBe(empty);
    const id = await add("bindings");
    await bind(id);
    await remove(id);
    expect(await repository.purge(id, start - 1)).toBeNull();
    expect(await bindings(id)).toHaveLength(1);
    await addUser([id]);
    expect(await repository.purge(id, start)).toBeNull();
    expect(await bindings(id)).toHaveLength(1);
  });

  it("retains all bindings when recovery wins, and gives a single winner to a concurrent purge", async () => {
    const id = await add();
    await bind(id);
    await remove(id);
    expect(await repository.restore(id, start, 102)).toBe(id);
    expect(await repository.purge(id, start)).toBeNull();
    expect(await bindings(id)).toHaveLength(1);
    await setClock(start + 2);
    const version = (await repository.findById(id))?.updateTimeUtc ?? null;
    await remove(id, version);
    const results = await Promise.all([
      repository.restore(id, start + 2, 102),
      repository.purge(id, start + 2),
    ]);
    expect(results.filter((value) => value === id)).toHaveLength(1);
    const active = await repository.findById(id);
    expect(await bindings(id)).toHaveLength(active ? 1 : 0);
  });

  it("rolls back permission deletion if the final owner deletion fails, and retries cleanly", async () => {
    const id = await add("rollback");
    await bind(id);
    await remove(id);
    await db.run(
      sql.raw(
        "CREATE TRIGGER test_role_purge_failure BEFORE DELETE ON system_role WHEN OLD.name = 'rollback' BEGIN SELECT RAISE(ABORT, 'synthetic purge failure'); END"
      )
    );
    await expect(repository.purge(id, start)).rejects.toThrow();
    expect(await repository.findDeletedById(id)).not.toBeNull();
    expect(await bindings(id)).toHaveLength(1);
    await expect(
      purgeExpiredRoles({
        now: start + SOFT_DELETE_RETENTION_MS,
        batchSize: 100,
      })
    ).rejects.toThrow();
    expect(await bindings(id)).toHaveLength(1);
    await db.run(sql`DROP TRIGGER test_role_purge_failure`);
    expect(
      await purgeExpiredRoles({
        now: start + SOFT_DELETE_RETENTION_MS,
        batchSize: 100,
      })
    ).toEqual({
      deletedCount: 1,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    });
  });

  it("cleans at most 100 exact-deadline roles, their bindings and reports remaining backlog", async () => {
    for (let index = 0; index < 103; index++) {
      const id = await add(`batch-${index}`);
      await bind(id);
      await remove(id);
    }
    const latest = await add("not expired");
    await setClock(start + 1);
    await remove(latest);
    expect(
      await purgeExpiredRoles({
        now: start + SOFT_DELETE_RETENTION_MS - 1,
        batchSize: 100,
      })
    ).toEqual({
      deletedCount: 0,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    });
    expect(
      await purgeExpiredRoles({
        now: start + SOFT_DELETE_RETENTION_MS,
        batchSize: 999,
      })
    ).toEqual({
      deletedCount: 100,
      remainingExpired: 3,
      oldestExpiredTimeUtc: start + SOFT_DELETE_RETENTION_MS,
    });
    expect(
      await db.all<{ total: number }>(
        sql`SELECT COUNT(*) AS total FROM system_role_permission`
      )
    ).toEqual([{ total: 3 }]);
    expect(
      await purgeExpiredRoles({
        now: start + SOFT_DELETE_RETENTION_MS,
        batchSize: 100,
      })
    ).toEqual({
      deletedCount: 3,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    });
    expect(await repository.findDeletedById(latest)).not.toBeNull();
  });
});
