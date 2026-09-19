import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq, sql } from "drizzle-orm";
import { Validator } from "@cfworker/json-schema";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import { SOFT_DELETE_UNDO_WINDOW_MS } from "@hodor/core/db/soft-delete";
import {
  RecycleBinRegistry,
  RecycleBinUndoError,
} from "@hodor/core/db/recycle-bin";
import type { UserObj } from "@hodor/core/types/app";
import departmentSql from "@hodor/core/db/sql/admin/system_department.sql?raw";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import { DepartmentRepository, departmentRepository } from "./repository";
import { departmentTable } from "./model";
import { DepartmentDeletionError } from "./errors";
import service, { restoreDeletedDepartment } from "./service";
import { departmentRecycleBinAdapter } from "./recycle-bin";
import { createRecycleBinHandlers } from "../../maintenance/recycle-bin/service";
import { rolePermissionRepository } from "../role_permission/repository";

const dependencies = vi.hoisted(() => ({ invalidateAuthCache: vi.fn() }));
vi.mock("@hodor/core/middleware/auth/cache-invalidation", () => dependencies);

const start = 1_800_000_000_000;
const deleteCode = "admin.system.department:delete";

function actor(
  userId = 101,
  codes = [deleteCode],
  isSuperAdmin = false
): UserObj {
  return {
    id: userId,
    userId,
    username: "undo-fixture",
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

const clockSql = () =>
  sql`(SELECT time_utc FROM test_department_undo_clock WHERE id = 1)`;
const repository = new DepartmentRepository(clockSql);
const registry = new RecycleBinRegistry();
registry.register(departmentRecycleBinAdapter);
const handlers = createRecycleBinHandlers(registry);

async function setClock(now: number) {
  await db.run(
    sql`UPDATE test_department_undo_clock SET time_utc = ${now} WHERE id = 1`
  );
}

async function add(name = "undo department", parentId: number | null = null) {
  return repository.onInsert({
    name,
    parentId,
    isEnabled: false,
    remark: "preserved",
    creatorId: 101,
    isDeleted: false,
    deletedTimeUtc: null,
    deleterId: null,
  });
}

async function remove(
  id: number,
  user = actor(),
  expectedUpdateTimeUtc: number | null = null
) {
  return service.deleteWithUndo.service({ id, expectedUpdateTimeUtc }, user);
}

async function undo(
  id: number,
  user = actor(),
  expectedDeletedTimeUtc = start
) {
  return handlers.onUndo(
    { resourceType: "department", id, expectedDeletedTimeUtc },
    user
  );
}

describe("department short undo with execution-time SQL clock", () => {
  beforeAll(async () => {
    await setupTestDb(db, [
      departmentSql,
      userSql,
      roleSql,
      permissionSql,
      rolePermissionSql,
    ]);
    await db.run(
      sql`CREATE TABLE IF NOT EXISTS test_department_undo_clock (id INTEGER PRIMARY KEY, time_utc INTEGER NOT NULL)`
    );
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await clearTestData(db, [
      "system_department",
      "system_user",
      "system_role",
      "system_permission",
      "system_role_permission",
      "test_department_undo_clock",
    ]);
    await db.run(
      sql`INSERT INTO test_department_undo_clock (id, time_utc) VALUES (1, ${start})`
    );
    vi.spyOn(departmentRepository, "onDeleteWithUndo").mockImplementation(
      repository.onDeleteWithUndo.bind(repository)
    );
    vi.spyOn(departmentRepository, "findUndoState").mockImplementation(
      repository.findUndoState.bind(repository)
    );
    vi.spyOn(departmentRepository, "undoDelete").mockImplementation(
      repository.undoDelete.bind(repository)
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it("requires a nullable expected update version and rejects client clocks or deletion metadata", () => {
    const validator = new Validator(service.deleteWithUndo.req as object);
    const input = { id: 1, expectedUpdateTimeUtc: null };
    expect(validator.validate(input).valid).toBe(true);
    for (const invalid of [
      { id: 1 },
      { ...input, expectedUpdateTimeUtc: -1 },
      { ...input, expectedUpdateTimeUtc: 1.5 },
      { ...input, now: start },
      { ...input, deleterId: 101 },
      { ...input, deletedTimeUtc: start },
    ])
      expect(validator.validate(invalid).valid).toBe(false);
  });

  it("exposes the observed nullable CAS version in listAll and requires it in its response schema", async () => {
    const id = await add("list version");
    const [original] = await service.listAll.service({});
    expect(original).toMatchObject({ id, updateTimeUtc: null });
    const validator = new Validator(service.listAll.res as object);
    expect(validator.validate([original]).valid).toBe(true);
    expect(validator.validate([{ id, updateTimeUtc: null }]).valid).toBe(true);
    expect(validator.validate([{ id, updateTimeUtc: start }]).valid).toBe(true);
    expect(validator.validate([{ id }]).valid).toBe(false);
    await db
      .update(departmentTable)
      .set({ updateTimeUtc: start - 1 })
      .where(eq(departmentTable.id, id));
    const [updated] = await service.listAll.service({});
    expect(updated.updateTimeUtc).toBe(start - 1);
    await expect(
      remove(id, actor(), original.updateTimeUtc)
    ).rejects.toMatchObject({ code: DepartmentDeletionError.STATE_CONFLICT });
    expect((await remove(id, actor(), updated.updateTimeUtc)).id).toBe(id);
  });

  it("returns an exact public SQL receipt and lets the deleter undo without restore/read/edit permissions", async () => {
    const id = await add();
    vi.spyOn(Date, "now").mockReturnValue(1);
    const receipt = await remove(id);
    expect(receipt).toEqual({
      resourceType: "department",
      id,
      expectedDeletedTimeUtc: start,
      serverTimeUtc: start,
      undoExpiresTimeUtc: start + SOFT_DELETE_UNDO_WINDOW_MS,
    });
    expect(
      new Validator(service.deleteWithUndo.res as object).validate(receipt)
        .valid
    ).toBe(true);
    await setClock(start + 5);
    expect(await undo(id)).toBe(id);
    const row = await repository.findById(id);
    expect(row).toMatchObject({
      id,
      isEnabled: false,
      remark: "preserved",
      updaterId: 101,
      updateTimeUtc: start + 5,
    });
    expect(await repository.findDeletedById(id)).toBeNull();
    expect(dependencies.invalidateAuthCache).toHaveBeenCalledTimes(2);
  });

  it("uses the real database clock and returns the persisted time from the same mutation", async () => {
    const real = new DepartmentRepository();
    const id = await add("real clock");
    vi.spyOn(Date, "now").mockReturnValue(1);
    const [before] = await db
      .select({ now: sql<number>`${getCurrentTimestampUtcSql()}` })
      .from(departmentTable)
      .where(eq(departmentTable.id, id));
    const receipt = await real.onDeleteWithUndo(id, null, 101);
    const state = await real.findUndoState(id);
    expect(receipt.expectedDeletedTimeUtc).toBe(receipt.serverTimeUtc);
    expect(state?.deletedTimeUtc).toBe(receipt.expectedDeletedTimeUtc);
    expect(receipt.serverTimeUtc).toBeGreaterThanOrEqual(before.now);
    expect(receipt.serverTimeUtc).toBeLessThanOrEqual(state!.serverTimeUtc);
    expect(receipt.serverTimeUtc).toBeGreaterThan(1_000_000_000_000);
    expect(await real.undoDelete(id, receipt.expectedDeletedTimeUtc, 101)).toBe(
      id
    );
  });

  it.each([0, 14_999])("allows age %s ms", async (age) => {
    const id = await add();
    await remove(id);
    await setClock(start + age);
    expect(await undo(id)).toBe(id);
  });

  it.each([-1, 15_000, 15_001])(
    "refuses age %s ms in both service and final SQL",
    async (age) => {
      const id = await add();
      await remove(id);
      await setClock(start + age);
      await expect(undo(id)).rejects.toMatchObject({
        code: RecycleBinUndoError.EXPIRED,
      });
      expect(await repository.undoDelete(id, start, 101)).toBeNull();
      expect(await repository.findDeletedById(id)).not.toBeNull();
    }
  );

  it.each([false, true])(
    "never lets another actor undo, including superadmin=%s",
    async (superAdmin) => {
      const id = await add();
      await remove(id);
      await expect(
        undo(id, actor(202, [deleteCode], superAdmin))
      ).rejects.toMatchObject({ code: RecycleBinUndoError.FORBIDDEN });
      expect(await repository.undoDelete(id, start, 202)).toBeNull();
    }
  );

  it("requires current deletion permission even for the original actor with restore authority", async () => {
    const id = await add();
    await remove(id);
    await expect(
      undo(
        id,
        actor(101, [
          "admin.maintenance.recycle_bin:restore",
          "admin.system.department:edit",
        ])
      )
    ).rejects.toMatchObject({ code: RecycleBinUndoError.FORBIDDEN });
    await expect(
      remove(await add("forbidden delete"), actor(101, []))
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it.each(["role-disabled", "permission-unbound"] as const)(
    "denies undo after current role authority is withdrawn: %s",
    async (change) => {
      await db.run(
        sql`INSERT INTO system_role (id, name, is_enabled, permission_count, data_scope, creator_id) VALUES (42, 'undo-role', 1, 1, 'all', 101)`
      );
      await db.run(
        sql`INSERT INTO system_permission (id, code, name, category, is_enabled, creator_id) VALUES (42, ${deleteCode}, 'delete', 'action', 1, 101)`
      );
      await db.run(
        sql`INSERT INTO system_role_permission (role_id, permission_id, creator_id) VALUES (42, 42, 101)`
      );
      const user = actor(101, []);
      user.ensureLoaded = async () => {
        user.permissions = (
          await rolePermissionRepository.getPermissionsByRoleIds([42])
        ).map((permission) => ({ ...permission, category: "action" as const }));
      };
      const id = await add();
      await remove(id, user);
      if (change === "role-disabled")
        await db.run(sql`UPDATE system_role SET is_enabled = 0 WHERE id = 42`);
      else
        await db.run(
          sql`DELETE FROM system_role_permission WHERE role_id = 42`
        );
      await expect(undo(id, user)).rejects.toMatchObject({
        code: RecycleBinUndoError.FORBIDDEN,
      });
      expect(await repository.findDeletedById(id)).not.toBeNull();
    }
  );

  it("refuses unknown department ID types at the adapter boundary", async () => {
    await expect(
      handlers.onUndo(
        {
          resourceType: "department",
          id: "101",
          expectedDeletedTimeUtc: start,
        },
        actor()
      )
    ).rejects.toMatchObject({ code: "INVALID_PARAMS" });
  });

  it("preserves the original numeric delete response and 30-day restore behavior", async () => {
    const id = await add();
    vi.spyOn(Date, "now").mockReturnValue(start);
    expect(await service.delete.service({ id }, actor())).toBe(id);
    await setClock(start + 15_000);
    await expect(undo(id)).rejects.toMatchObject({
      code: RecycleBinUndoError.EXPIRED,
    });
    expect(await restoreDeletedDepartment(id, start, 202, start + 15_000)).toBe(
      id
    );
  });

  it("rejects stale delete versions and same-millisecond clocks without changing the row", async () => {
    const id = await add();
    await db
      .update(departmentTable)
      .set({ updateTimeUtc: start })
      .where(eq(departmentTable.id, id));
    await expect(remove(id)).rejects.toMatchObject({
      code: DepartmentDeletionError.STATE_CONFLICT,
    });
    await expect(remove(id, actor(), start)).rejects.toMatchObject({
      code: DepartmentDeletionError.CLOCK_CONFLICT,
    });
    await setClock(start - 1);
    await expect(remove(id, actor(), start)).rejects.toMatchObject({
      code: DepartmentDeletionError.CLOCK_CONFLICT,
    });
    await setClock(start + 1);
    expect((await remove(id, actor(), start)).expectedDeletedTimeUtc).toBe(
      start + 1
    );
  });

  it("blocks delayed deletion after undo and old undo after a new deletion cycle", async () => {
    const id = await add();
    await remove(id);
    await setClock(start + 1);
    await undo(id);
    await setClock(start + 2);
    await expect(remove(id)).rejects.toMatchObject({
      code: DepartmentDeletionError.STATE_CONFLICT,
    });
    await remove(id, actor(), start + 1);
    await expect(undo(id)).rejects.toMatchObject({
      code: DepartmentDeletionError.STALE_DELETION,
    });
    expect(await repository.undoDelete(id, start, 101)).toBeNull();
    expect(await undo(id, actor(), start + 2)).toBe(id);
  });

  it("does not renew duplicate deletion receipts or let repeated undo mutate the record", async () => {
    const id = await add();
    await remove(id);
    await setClock(start + 10);
    await expect(remove(id)).rejects.toMatchObject({
      code: DepartmentDeletionError.NOT_ACTIVE,
    });
    expect((await repository.findDeletedById(id))?.deletedTimeUtc).toBe(start);
    await undo(id);
    await expect(undo(id)).rejects.toMatchObject({
      code: DepartmentDeletionError.NOT_DELETED,
    });
    expect((await repository.findById(id))?.updateTimeUtc).toBe(start + 10);
  });

  it("retains a name conflict until the conflicting active record changes", async () => {
    const id = await add("same name");
    await remove(id);
    const conflictId = await add("same name");
    await expect(undo(id)).rejects.toMatchObject({
      code: DepartmentDeletionError.NAME_CONFLICT,
    });
    expect(await repository.findDeletedById(id)).not.toBeNull();
    await db
      .update(departmentTable)
      .set({ name: "renamed" })
      .where(eq(departmentTable.id, conflictId));
    expect(await undo(id)).toBe(id);
  });

  it("rejects restoration when the parent is no longer active", async () => {
    const parentId = await add("parent");
    const id = await add("child", parentId);
    await remove(id);
    await remove(parentId);
    await expect(undo(id)).rejects.toMatchObject({
      code: DepartmentDeletionError.INVALID_PARENT,
    });
    expect(await repository.undoDelete(id, start, 101)).toBeNull();
  });

  it("guards a parent deleted after the friendly precheck", async () => {
    const parentId = await add("race parent");
    const id = await add("race child", parentId);
    await remove(id);
    vi.mocked(departmentRepository.undoDelete).mockImplementationOnce(
      async (...args) => {
        await repository.onDeleteWithUndo(parentId, null, 101);
        return repository.undoDelete(...args);
      }
    );
    await expect(undo(id)).rejects.toMatchObject({
      code: DepartmentDeletionError.INVALID_PARENT,
    });
    expect(await repository.findDeletedById(id)).not.toBeNull();
  });

  it.each(["permissions", "precheck", "mutation"] as const)(
    "refuses a deadline crossed during %s without trusting Date.now",
    async (stage) => {
      const id = await add();
      await remove(id);
      const user = actor();
      vi.spyOn(Date, "now").mockReturnValue(start);
      if (stage === "permissions")
        user.ensureLoaded = () => setClock(start + 15_000);
      if (stage === "precheck")
        vi.mocked(departmentRepository.findUndoState).mockImplementationOnce(
          async (target) => {
            const row = await repository.findUndoState(target);
            await setClock(start + 15_000);
            return row;
          }
        );
      if (stage === "mutation")
        vi.mocked(departmentRepository.undoDelete).mockImplementationOnce(
          async (...args) => {
            await setClock(start + 15_000);
            return repository.undoDelete(...args);
          }
        );
      await expect(undo(id, user)).rejects.toMatchObject({
        code: RecycleBinUndoError.EXPIRED,
      });
      expect(await repository.findDeletedById(id)).not.toBeNull();
    }
  );

  it.each(["restore", "purge"] as const)(
    "does not mutate when %s wins after the precheck",
    async (operation) => {
      const id = await add();
      await remove(id);
      vi.mocked(departmentRepository.undoDelete).mockImplementationOnce(
        async (...args) => {
          if (operation === "restore")
            await repository.restore(id, start, 202, start + 1);
          else await repository.purge(id, start);
          return repository.undoDelete(...args);
        }
      );
      await expect(undo(id)).rejects.toMatchObject({
        code: DepartmentDeletionError.NOT_DELETED,
      });
      if (operation === "restore")
        expect((await repository.findById(id))?.updaterId).toBe(202);
      else expect(await repository.findById(id)).toBeNull();
    }
  );

  it("allows only one of two concurrent SQL undo attempts to change state", async () => {
    const id = await add();
    await remove(id);
    const results = await Promise.all([
      repository.undoDelete(id, start, 101),
      repository.undoDelete(id, start, 101),
    ]);
    expect(results.filter((value) => value === id)).toHaveLength(1);
    expect(results.filter((value) => value === null)).toHaveLength(1);
  });

  it("keeps reference guards on the new deletion path, including disabled roles", async () => {
    const id = await add();
    await db.run(
      sql`INSERT INTO system_role (name, is_enabled, permission_count, data_scope, custom_dept_ids, creator_id) VALUES ('reference-role', 0, 0, 'custom', ${JSON.stringify([id])}, 101)`
    );
    await expect(remove(id)).rejects.toMatchObject({
      code: DepartmentDeletionError.HAS_REFERENCES,
    });
    expect(await repository.findById(id)).not.toBeNull();
  });
});
