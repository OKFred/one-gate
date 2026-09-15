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
import { SOFT_DELETE_RETENTION_MS } from "@hodor/core/db/soft-delete";
import type { UserObj } from "@hodor/core/types/app";
import departmentSql from "@hodor/core/db/sql/admin/system_department.sql?raw";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import complianceSql from "@hodor/core/db/sql/admin/compliance_archives.sql?raw";
import service, {
  listDeletedDepartments,
  restoreDeletedDepartment,
  purgeDeletedDepartment,
} from "./service";
import { departmentRepository, purgeExpiredDepartments } from "./repository";
import { departmentTable } from "./model";
import { DepartmentDeletionError as ErrorCode } from "./errors";
import { userRepository } from "../user/repository";
import { userTable } from "../user/model";
import userService from "../user/service";
import { roleRepository } from "../role/repository";
import { roleTable } from "../role/model";

const deletionTime = 1_800_000_000_000;
const actor = { userId: 101 } as UserObj;

function addDepartment(
  name: string,
  parentId: number | null = null,
  isEnabled = true
) {
  return departmentRepository.onInsert({
    name,
    parentId,
    isEnabled,
    creatorId: actor.userId,
    remark: "kept for recovery",
    isDeleted: false,
    deletedTimeUtc: null,
    deleterId: null,
  });
}

function addUser(
  username: string,
  departmentId: number | null,
  isEnabled = false
) {
  return userRepository.onInsert({
    username,
    password: "test-hash",
    langCode: "zh-CN",
    departmentId,
    roleIdArr: [],
    isEnabled,
    creatorId: actor.userId,
  });
}

function addRole(name: string, departmentIds: number[]) {
  return roleRepository.onInsert({
    name,
    customDeptIds: JSON.stringify(departmentIds),
    dataScope: "custom",
    isEnabled: false,
    permissionCount: 0,
    creatorId: actor.userId,
  });
}

describe("department soft deletion and guarded references", () => {
  beforeAll(async () => {
    await setupTestDb(db, [departmentSql, userSql, roleSql, complianceSql]);
  });

  beforeEach(async () => {
    await clearTestData(db, [
      "system_department",
      "system_user",
      "system_role",
      "compliance_archives",
    ]);
  });

  afterEach(() => vi.restoreAllMocks());

  it("rejects client-provided deletion state on ordinary add and update APIs", () => {
    const add = new Validator(service.add.req);
    const update = new Validator(service.update.req);
    expect(
      add.validate({
        name: "forged",
        parentId: null,
        remark: null,
        isEnabled: true,
        isDeleted: true,
      }).valid
    ).toBe(false);
    expect(update.validate({ id: 1, deletedTimeUtc: deletionTime }).valid).toBe(
      false
    );
    expect(update.validate({ id: 1, deleterId: 99 }).valid).toBe(false);
  });

  it("retains the row but hides it from every ordinary read and writes no archive snapshot", async () => {
    const id = await addDepartment("hidden", null, false);
    const before = await departmentRepository.findById(id);
    expect(before).not.toHaveProperty("isDeleted");
    await service.delete.service({ id }, actor);
    const raw = await departmentRepository.findDeletedById(id);
    expect(raw).toMatchObject({
      id,
      isDeleted: true,
      isEnabled: false,
      deleterId: actor.userId,
      remark: "kept for recovery",
    });
    expect(raw?.deletedTimeUtc).toEqual(expect.any(Number));
    expect(await departmentRepository.findById(id)).toBeNull();
    expect(await departmentRepository.getDepartmentNameById(id)).toBeNull();
    expect(await departmentRepository.findAll({})).toEqual([]);
    expect(await departmentRepository.getAllDepartments()).toEqual([]);
    expect(await departmentRepository.getTreeData()).toEqual([]);
    expect(
      await departmentRepository.findPage({ pageNo: 1, pageSize: 10 })
    ).toEqual({ total: 0, list: [] });
    await expect(service.get.service({ id })).rejects.toThrow();
    await expect(
      departmentRepository.onUpdate(id, { name: "cannot edit trash" })
    ).rejects.toMatchObject({ code: ErrorCode.STATE_CONFLICT });
    expect(
      await db.all<{ total: number }>(
        sql`SELECT count(*) AS total FROM compliance_archives`
      )
    ).toEqual([{ total: 0 }]);
  });

  it("restores the same ID and disabled state, clears deletion fields, and updates audit metadata", async () => {
    const id = await addDepartment("restore disabled", null, false);
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await expect(
      restoreDeletedDepartment(id, deletionTime, 202, deletionTime + 1)
    ).resolves.toBe(id);
    const rows = await db
      .select()
      .from(departmentTable)
      .where(eq(departmentTable.id, id));
    expect(rows[0]).toMatchObject({
      id,
      isEnabled: false,
      isDeleted: false,
      deletedTimeUtc: null,
      deleterId: null,
      updaterId: 202,
      updateTimeUtc: deletionTime + 1,
    });
    expect(await departmentRepository.findById(id)).not.toHaveProperty(
      "deletedTimeUtc"
    );
  });

  it("does not extend retention on duplicate deletion and rejects stale restore and purge requests", async () => {
    const id = await addDepartment("stale");
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await expect(
      departmentRepository.onDelete(id, actor.userId, deletionTime + 10)
    ).rejects.toMatchObject({ code: ErrorCode.NOT_ACTIVE });
    expect(
      (await departmentRepository.findDeletedById(id))?.deletedTimeUtc
    ).toBe(deletionTime);
    await restoreDeletedDepartment(
      id,
      deletionTime,
      actor.userId,
      deletionTime + 10
    );
    await departmentRepository.onDelete(id, actor.userId, deletionTime + 20);
    await expect(
      restoreDeletedDepartment(
        id,
        deletionTime,
        actor.userId,
        deletionTime + 30
      )
    ).rejects.toMatchObject({ code: ErrorCode.STALE_DELETION });
    await expect(
      purgeDeletedDepartment(id, deletionTime, actor.userId, deletionTime + 30)
    ).rejects.toMatchObject({ code: ErrorCode.STALE_DELETION });
    expect(
      (await departmentRepository.findDeletedById(id))?.deletedTimeUtc
    ).toBe(deletionTime + 20);
  });

  it("advances deletion versions when restore and delete share the same millisecond", async () => {
    const id = await addDepartment("same millisecond");
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await restoreDeletedDepartment(
      id,
      deletionTime,
      actor.userId,
      deletionTime
    );
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    expect(
      (await departmentRepository.findDeletedById(id))?.deletedTimeUtc
    ).toBe(deletionTime + 1);
    await expect(
      purgeDeletedDepartment(id, deletionTime, actor.userId, deletionTime + 1)
    ).rejects.toMatchObject({ code: ErrorCode.STALE_DELETION });
  });

  it("does not silently extend retention when a legacy update time is in the future", async () => {
    const id = await addDepartment("future clock");
    await db
      .update(departmentTable)
      .set({ updateTimeUtc: deletionTime + SOFT_DELETE_RETENTION_MS })
      .where(eq(departmentTable.id, id));
    await expect(
      departmentRepository.onDelete(id, actor.userId, deletionTime)
    ).rejects.toMatchObject({ code: ErrorCode.CLOCK_CONFLICT });
    expect(await departmentRepository.findDeletedById(id)).toBeNull();
  });

  it("does not reuse a deletion version across multiple cycles before the clock advances", async () => {
    const id = await addDepartment("many same-millisecond cycles");
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await restoreDeletedDepartment(
      id,
      deletionTime,
      actor.userId,
      deletionTime
    );
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await restoreDeletedDepartment(
      id,
      deletionTime + 1,
      actor.userId,
      deletionTime
    );
    await expect(
      departmentRepository.onDelete(id, actor.userId, deletionTime)
    ).rejects.toMatchObject({ code: ErrorCode.CLOCK_CONFLICT });
    await departmentRepository.onDelete(id, actor.userId, deletionTime + 1);
    expect(
      (await departmentRepository.findDeletedById(id))?.deletedTimeUtc
    ).toBe(deletionTime + 2);
    await expect(
      purgeDeletedDepartment(
        id,
        deletionTime + 1,
        actor.userId,
        deletionTime + 2
      )
    ).rejects.toMatchObject({ code: ErrorCode.STALE_DELETION });
  });

  it("preserves the deletion generation through restore, ordinary edit, and deletion", async () => {
    vi.spyOn(Date, "now").mockReturnValue(deletionTime);
    const id = await addDepartment("edited same-millisecond record");
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await restoreDeletedDepartment(
      id,
      deletionTime,
      actor.userId,
      deletionTime
    );
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await restoreDeletedDepartment(
      id,
      deletionTime + 1,
      actor.userId,
      deletionTime
    );
    await departmentRepository.onUpdate(id, {
      remark: "edit must preserve the version",
    });
    expect((await departmentRepository.findById(id))?.updateTimeUtc).toBe(
      deletionTime + 1
    );
    await expect(
      departmentRepository.onDelete(id, actor.userId, deletionTime)
    ).rejects.toMatchObject({ code: ErrorCode.CLOCK_CONFLICT });
    await departmentRepository.onDelete(id, actor.userId, deletionTime + 1);
    expect(
      (await departmentRepository.findDeletedById(id))?.deletedTimeUtc
    ).toBe(deletionTime + 2);
    await expect(
      purgeDeletedDepartment(
        id,
        deletionTime + 1,
        actor.userId,
        deletionTime + 2
      )
    ).rejects.toMatchObject({ code: ErrorCode.STALE_DELETION });
  });

  it("releases names for repeated creation and deletion, while refusing conflicting restoration", async () => {
    const first = await addDepartment("reusable");
    await departmentRepository.onDelete(first, actor.userId, deletionTime);
    const second = await addDepartment("reusable");
    await expect(
      restoreDeletedDepartment(
        first,
        deletionTime,
        actor.userId,
        deletionTime + 1
      )
    ).rejects.toMatchObject({ code: ErrorCode.NAME_CONFLICT });
    await departmentRepository.onDelete(second, actor.userId, deletionTime + 2);
    const third = await addDepartment("reusable");
    expect(new Set([first, second, third]).size).toBe(3);
    await expect(addDepartment("reusable")).rejects.toMatchObject({
      code: ErrorCode.NAME_CONFLICT,
    });
  });

  it("requires restoring parents first and clearing all physical children before purging parents", async () => {
    const parent = await addDepartment("parent");
    const child = await addDepartment("child", parent, false);
    await expect(
      departmentRepository.onDelete(parent, actor.userId, deletionTime)
    ).rejects.toMatchObject({ code: ErrorCode.HAS_REFERENCES });
    await departmentRepository.onDelete(child, actor.userId, deletionTime);
    await departmentRepository.onDelete(parent, actor.userId, deletionTime + 1);
    await expect(
      restoreDeletedDepartment(
        child,
        deletionTime,
        actor.userId,
        deletionTime + 2
      )
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_PARENT });
    await expect(
      purgeDeletedDepartment(
        parent,
        deletionTime + 1,
        actor.userId,
        deletionTime + 2
      )
    ).rejects.toMatchObject({ code: ErrorCode.HAS_REFERENCES });
    await restoreDeletedDepartment(
      parent,
      deletionTime + 1,
      actor.userId,
      deletionTime + 2
    );
    await restoreDeletedDepartment(
      child,
      deletionTime,
      actor.userId,
      deletionTime + 2
    );
    expect((await departmentRepository.getTreeData()).length).toBe(2);
  });

  it("blocks disabled user references and allows an explicit null to detach the user", async () => {
    const id = await addDepartment("user reference");
    const userId = await addUser("disabled user", id);
    await expect(
      departmentRepository.onDelete(id, actor.userId, deletionTime)
    ).rejects.toMatchObject({ code: ErrorCode.HAS_REFERENCES });
    await userService.update.service(
      { id: userId, departmentObj: null },
      actor
    );
    expect((await userRepository.findById(userId))?.departmentId).toBeNull();
    await expect(
      departmentRepository.onDelete(id, actor.userId, deletionTime)
    ).resolves.toBe(id);
  });

  it("blocks disabled role references until cleared and validates role JSON arrays", async () => {
    const id = await addDepartment("role reference");
    const roleId = await addRole("disabled role", [id]);
    await expect(
      departmentRepository.onDelete(id, actor.userId, deletionTime)
    ).rejects.toMatchObject({ code: ErrorCode.HAS_REFERENCES });
    await roleRepository.onUpdate(roleId, { customDeptIds: null });
    await expect(
      departmentRepository.onDelete(id, actor.userId, deletionTime)
    ).resolves.toBe(id);
    for (const invalid of [
      "bad-json",
      "{}",
      '["1"]',
      "[-1]",
      "[1.5]",
      "null",
    ]) {
      await expect(
        roleRepository.onUpdate(roleId, { customDeptIds: invalid })
      ).rejects.toMatchObject({ code: ErrorCode.INVALID_DEPARTMENT_IDS });
    }
  });

  it("atomically refuses user, child and role writes referencing a department deleted after a precheck", async () => {
    const id = await addDepartment("race target");
    const unrelatedChild = await addDepartment("unrelated child");
    const userId = await addUser("unrelated user", null);
    const roleId = await addRole("unrelated role", []);
    expect(await departmentRepository.findById(id)).not.toBeNull();
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await expect(addUser("late user", id)).rejects.toMatchObject({
      code: ErrorCode.REFERENCE_UNAVAILABLE,
    });
    await expect(
      userRepository.onUpdate(userId, { departmentId: id })
    ).rejects.toMatchObject({ code: ErrorCode.REFERENCE_UNAVAILABLE });
    await expect(addDepartment("late child", id)).rejects.toMatchObject({
      code: ErrorCode.INVALID_PARENT,
    });
    await expect(
      departmentRepository.onUpdate(unrelatedChild, { parentId: id })
    ).rejects.toMatchObject({ code: ErrorCode.STATE_CONFLICT });
    await expect(addRole("late role", [id])).rejects.toMatchObject({
      code: ErrorCode.REFERENCE_UNAVAILABLE,
    });
    await expect(
      roleRepository.onUpdate(roleId, { customDeptIds: JSON.stringify([id]) })
    ).rejects.toMatchObject({ code: ErrorCode.REFERENCE_UNAVAILABLE });
    expect((await userRepository.findById(userId))?.departmentId).toBeNull();
    expect(
      (await departmentRepository.findById(unrelatedChild))?.parentId
    ).toBeNull();
  });

  it.each(["child", "user", "role"] as const)(
    "refuses deletion when a %s reference arrives after service prechecks",
    async (kind) => {
      const id = await addDepartment(`precheck ${kind}`);
      const originalDelete =
        departmentRepository.onDelete.bind(departmentRepository);
      vi.spyOn(departmentRepository, "onDelete").mockImplementationOnce(
        async (...args) => {
          if (kind === "child") await addDepartment("racing child", id, false);
          if (kind === "user") await addUser("racing user", id);
          if (kind === "role") await addRole("racing role", [id]);
          return originalDelete(...args);
        }
      );
      await expect(service.delete.service({ id }, actor)).rejects.toMatchObject(
        { code: ErrorCode.HAS_REFERENCES }
      );
      expect(await departmentRepository.findById(id)).not.toBeNull();
    }
  );

  it("blocks cycles even when the involved departments are disabled", async () => {
    const parent = await addDepartment("disabled parent", null, false);
    const child = await addDepartment("disabled child", parent, false);
    await expect(
      departmentRepository.onUpdate(parent, { parentId: child })
    ).rejects.toMatchObject({ code: ErrorCode.STATE_CONFLICT });
    await expect(
      departmentRepository.onUpdate(parent, { parentId: parent })
    ).rejects.toMatchObject({ code: ErrorCode.STATE_CONFLICT });
  });

  it("searches long Chinese keywords beyond D1 LIKE pattern limits", async () => {
    const keyword = "研发部门".repeat(15);
    const id = await addDepartment(`测试${keyword}回收站`);
    const other = await addDepartment("其他研发部门");
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await departmentRepository.onDelete(other, actor.userId, deletionTime);
    const result = await listDeletedDepartments({
      keyword,
      pageNo: 1,
      pageSize: 10,
      now: deletionTime + 1,
    });
    expect(result.total).toBe(1);
    expect(result.list.map((row) => row.id)).toEqual([id]);
  });

  it("treats percent signs as literal text in recycle-bin searches", async () => {
    const literal = await addDepartment("研发部门 100%");
    const other = await addDepartment("研发部门 100");
    await departmentRepository.onDelete(literal, actor.userId, deletionTime);
    await departmentRepository.onDelete(other, actor.userId, deletionTime);
    const result = await listDeletedDepartments({
      keyword: "%",
      pageNo: 1,
      pageSize: 10,
      now: deletionTime + 1,
    });
    expect(result.total).toBe(1);
    expect(result.list.map((row) => row.id)).toEqual([literal]);
  });

  it("lists deletion metadata and makes records non-restorable at exactly 30 days", async () => {
    const id = await addDepartment("expiry boundary");
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    const before = await listDeletedDepartments({
      pageNo: 1,
      pageSize: 10,
      keyword: "expiry",
      now: deletionTime + SOFT_DELETE_RETENTION_MS - 1,
    });
    expect(before.list[0]).toEqual({
      id,
      name: "expiry boundary",
      deleterId: actor.userId,
      deleterName: null,
      deletedTimeUtc: deletionTime,
      expiresTimeUtc: deletionTime + SOFT_DELETE_RETENTION_MS,
      canRestore: true,
    });
    const due = await listDeletedDepartments({
      pageNo: 1,
      pageSize: 10,
      now: deletionTime + SOFT_DELETE_RETENTION_MS,
    });
    expect(due.list[0]?.canRestore).toBe(false);
    await expect(
      restoreDeletedDepartment(
        id,
        deletionTime,
        actor.userId,
        deletionTime + SOFT_DELETE_RETENTION_MS
      )
    ).rejects.toMatchObject({ code: ErrorCode.EXPIRED });
    const cleanup = await purgeExpiredDepartments({
      now: deletionTime + SOFT_DELETE_RETENTION_MS,
      batchSize: 100,
    });
    expect(cleanup).toEqual({
      deletedCount: 1,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    });
  });

  it.each(["deletion lookup", "parent lookup"] as const)(
    "rejects restoration when the deadline passes during the %s",
    async (lookup) => {
      const parentId =
        lookup === "parent lookup"
          ? await addDepartment("expiry parent")
          : null;
      const id = await addDepartment("expiry during lookup", parentId);
      await departmentRepository.onDelete(id, actor.userId, deletionTime);
      const expiresTimeUtc = deletionTime + SOFT_DELETE_RETENTION_MS;
      let currentTimeUtc = expiresTimeUtc - 1;
      vi.spyOn(Date, "now").mockImplementation(() => currentTimeUtc);
      if (lookup === "deletion lookup") {
        const findDeletedById =
          departmentRepository.findDeletedById.bind(departmentRepository);
        vi.spyOn(
          departmentRepository,
          "findDeletedById"
        ).mockImplementationOnce(async (departmentId) => {
          const row = await findDeletedById(departmentId);
          currentTimeUtc = expiresTimeUtc;
          return row;
        });
      } else {
        const findById =
          departmentRepository.findById.bind(departmentRepository);
        vi.spyOn(departmentRepository, "findById").mockImplementationOnce(
          async (departmentId) => {
            const row = await findById(departmentId);
            currentTimeUtc = expiresTimeUtc;
            return row;
          }
        );
      }
      const restore = vi.spyOn(departmentRepository, "restore");
      await expect(
        restoreDeletedDepartment(id, deletionTime, actor.userId)
      ).rejects.toMatchObject({ code: ErrorCode.EXPIRED });
      expect(restore).not.toHaveBeenCalled();
      expect(await departmentRepository.findDeletedById(id)).toMatchObject({
        id,
        isDeleted: true,
        deletedTimeUtc: deletionTime,
        deleterId: actor.userId,
      });
    }
  );

  it("keeps not-yet-due and restored rows, limits batches, and reports overdue backlog", async () => {
    for (let index = 0; index < 3; index += 1) {
      const id = await addDepartment(`due ${index}`);
      await departmentRepository.onDelete(id, actor.userId, deletionTime);
    }
    const fresh = await addDepartment("fresh");
    await departmentRepository.onDelete(fresh, actor.userId, deletionTime + 1);
    const restored = await addDepartment("restored");
    await departmentRepository.onDelete(restored, actor.userId, deletionTime);
    await restoreDeletedDepartment(
      restored,
      deletionTime,
      actor.userId,
      deletionTime + 1
    );
    const first = await purgeExpiredDepartments({
      now: deletionTime + SOFT_DELETE_RETENTION_MS,
      batchSize: 2,
    });
    expect(first).toEqual({
      deletedCount: 2,
      remainingExpired: 1,
      oldestExpiredTimeUtc: deletionTime + SOFT_DELETE_RETENTION_MS,
    });
    expect(await departmentRepository.findDeletedById(fresh)).not.toBeNull();
    expect(await departmentRepository.findById(restored)).not.toBeNull();
    expect(
      (
        await purgeExpiredDepartments({
          now: deletionTime + SOFT_DELETE_RETENTION_MS,
          batchSize: 2,
        })
      ).deletedCount
    ).toBe(1);
  });

  it("rechecks references before cleanup and exposes blocked records as overdue", async () => {
    const id = await addDepartment("legacy reference");
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    // Simulate a legacy import outside the application write paths.
    await db.insert(userTable).values({
      username: "legacy",
      password: "test-hash",
      langCode: "zh-CN",
      departmentId: id,
      roleIdArr: [],
      isEnabled: false,
      creatorId: actor.userId,
    });
    expect(
      await purgeExpiredDepartments({
        now: deletionTime + SOFT_DELETE_RETENTION_MS,
        batchSize: 100,
      })
    ).toEqual({
      deletedCount: 0,
      remainingExpired: 1,
      oldestExpiredTimeUtc: deletionTime + SOFT_DELETE_RETENTION_MS,
    });
    await expect(
      purgeDeletedDepartment(id, deletionTime, actor.userId)
    ).rejects.toMatchObject({ code: ErrorCode.HAS_REFERENCES });
  });

  it("fills cleanup batches past 100 older referenced rows and drains the backlog after detaching references", async () => {
    const blockedIds: number[] = [];
    for (let index = 0; index < 100; index += 1) {
      const id = await addDepartment(`blocked cleanup ${index}`);
      await departmentRepository.onDelete(
        id,
        actor.userId,
        deletionTime + index
      );
      blockedIds.push(id);
      // Legacy imports can leave references that guarded application writes reject.
      await db.insert(userTable).values({
        username: `legacy cleanup ${index}`,
        password: "test-hash",
        langCode: "zh-CN",
        departmentId: id,
        roleIdArr: [],
        isEnabled: false,
        creatorId: actor.userId,
      });
    }
    const eligibleIds: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      const id = await addDepartment(`eligible cleanup ${index}`);
      await departmentRepository.onDelete(
        id,
        actor.userId,
        deletionTime + 100 + index
      );
      eligibleIds.push(id);
    }
    const now = deletionTime + SOFT_DELETE_RETENTION_MS + 200;
    expect(await purgeExpiredDepartments({ now, batchSize: 2 })).toEqual({
      deletedCount: 2,
      remainingExpired: 101,
      oldestExpiredTimeUtc: deletionTime + SOFT_DELETE_RETENTION_MS,
    });
    expect(
      (
        await db
          .select({ id: departmentTable.id })
          .from(departmentTable)
          .orderBy(departmentTable.id)
      ).map(({ id }) => id)
    ).toEqual([...blockedIds, eligibleIds[2]]);
    expect(await purgeExpiredDepartments({ now, batchSize: 2 })).toEqual({
      deletedCount: 1,
      remainingExpired: 100,
      oldestExpiredTimeUtc: deletionTime + SOFT_DELETE_RETENTION_MS,
    });

    await db.update(userTable).set({ departmentId: null });
    expect(await purgeExpiredDepartments({ now, batchSize: 100 })).toEqual({
      deletedCount: 100,
      remainingExpired: 0,
      oldestExpiredTimeUtc: null,
    });
    expect(
      await db.select({ id: departmentTable.id }).from(departmentTable)
    ).toEqual([]);
  });

  it("a parent deleted between restore precheck and mutation cannot produce an active orphan", async () => {
    const parent = await addDepartment("restore race parent");
    const child = await addDepartment("restore race child", parent);
    await departmentRepository.onDelete(child, actor.userId, deletionTime);
    const originalRestore =
      departmentRepository.restore.bind(departmentRepository);
    vi.spyOn(departmentRepository, "restore").mockImplementationOnce(
      async (...args) => {
        await departmentRepository.onDelete(
          parent,
          actor.userId,
          deletionTime + 1
        );
        return originalRestore(...args);
      }
    );
    await expect(
      restoreDeletedDepartment(
        child,
        deletionTime,
        actor.userId,
        deletionTime + 2
      )
    ).rejects.toMatchObject({ code: ErrorCode.STATE_CONFLICT });
    expect(await departmentRepository.findDeletedById(child)).not.toBeNull();
  });

  it("a restoration between purge precheck and mutation prevents permanent deletion", async () => {
    const id = await addDepartment("purge race");
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    const originalPurge = departmentRepository.purge.bind(departmentRepository);
    vi.spyOn(departmentRepository, "purge").mockImplementationOnce(
      async (...args) => {
        await restoreDeletedDepartment(
          id,
          deletionTime,
          actor.userId,
          deletionTime + 1
        );
        return originalPurge(...args);
      }
    );
    await expect(
      purgeDeletedDepartment(id, deletionTime, actor.userId, deletionTime + 2)
    ).rejects.toMatchObject({ code: ErrorCode.NOT_DELETED });
    expect(await departmentRepository.findById(id)).not.toBeNull();
  });

  it("allows explicit early purge and rejects purging active records", async () => {
    const id = await addDepartment("early purge");
    await expect(
      purgeDeletedDepartment(id, deletionTime, actor.userId, deletionTime)
    ).rejects.toMatchObject({ code: ErrorCode.NOT_DELETED });
    await departmentRepository.onDelete(id, actor.userId, deletionTime);
    await expect(
      purgeDeletedDepartment(id, deletionTime, actor.userId, deletionTime + 1)
    ).resolves.toBe(id);
    expect(
      await db.select().from(departmentTable).where(eq(departmentTable.id, id))
    ).toEqual([]);
  });

  it("keeps role scope checks bound to all requested IDs in a single mutation", async () => {
    const active = await addDepartment("active scope");
    const deleted = await addDepartment("deleted scope");
    await departmentRepository.onDelete(deleted, actor.userId, deletionTime);
    await expect(
      addRole("mixed scope", [active, deleted])
    ).rejects.toMatchObject({ code: ErrorCode.REFERENCE_UNAVAILABLE });
    expect(await db.select().from(roleTable)).toEqual([]);
  });
});
