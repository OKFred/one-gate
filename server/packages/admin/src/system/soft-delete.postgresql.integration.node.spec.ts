import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../../../../apps/server/test/postgresql";
import { withPostgresTransaction } from "@hodor/core/db/postgresql/runtime";
import { SOFT_DELETE_RETENTION_MS } from "@hodor/core/db/soft-delete";
import { RecycleBinUndoError } from "@hodor/core/db/recycle-bin";
import { BusinessErrorCode } from "@hodor/core/middleware/errorHandler/businessError";
import {
  DepartmentRepository,
  purgeExpiredDepartments,
} from "./department/repository.pg";
import { RoleRepository, purgeExpiredRoles } from "./role/repository.pg";
import { DepartmentDeletionError } from "./department/errors";
import { RoleDeletionError } from "./role/errors";
import { departmentRepository as departmentFacade } from "./department/repository";
import { roleRepository as roleFacade } from "./role/repository";

describe.skipIf(!postgresTestsConfigured)(
  "real PostgreSQL department and role deletion",
  () => {
    let harness: PostgresTestHarness;
    let now: number;
    let departments: DepartmentRepository;
    let roles: RoleRepository;
    beforeAll(async () => {
      harness = await createPostgresTestHarness("soft_delete_tests");
    });
    afterAll(async () => {
      await harness?.close();
    });
    beforeEach(async () => {
      await harness.reset();
      await harness.seedEnterpriseIdentities();
      now = Date.now() - 60_000;
      departments = new DepartmentRepository(() => sql`${now}::bigint`);
      roles = new RoleRepository(() => sql`${now}::bigint`);
    });
    const department = (name: string, parentId: number | null = null) =>
      departments.onInsert({
        name,
        parentId,
        isEnabled: false,
        creatorId: 1,
        isDeleted: false,
        deletedTimeUtc: null,
        deleterId: null,
      });
    const role = (name: string, customDeptIds: string | null = null) =>
      roles.onInsert({
        name,
        isEnabled: true,
        permissionCount: 0,
        dataScope: "all",
        customDeptIds,
        creatorId: 1,
      });

    for (const resource of ["department", "role"] as const) {
      describe(resource, () => {
        const repository = () =>
          resource === "department" ? departments : roles;
        const insert = (name: string) =>
          resource === "department" ? department(name) : role(name);
        const code =
          resource === "department"
            ? DepartmentDeletionError
            : RoleDeletionError;
        const table = () => sql.identifier(`system_${resource}`);
        const purge = (id: number, version: number, actorId = 1) =>
          resource === "department"
            ? departments.purge(id, version, actorId)
            : roles.purge(id, version, undefined, actorId);
        it("hides deleted records, preserves the exact numeric version, and restores the original record", async () => {
          await harness.run(async () => {
            const id = await insert("synthetic-hidden");
            const receipt = await repository().onDeleteWithUndo(id, null, 1);
            expect(receipt).toEqual({
              id,
              expectedDeletedTimeUtc: now,
              serverTimeUtc: now,
            });
            expect(await repository().findById(id)).toBeNull();
            expect(await repository().findAll({})).not.toContainEqual(
              expect.objectContaining({ id })
            );
            const page = await repository().listDeleted({
              pageNo: 1,
              pageSize: 10,
              now,
            });
            expect(page.list[0]).toMatchObject({
              id,
              deletedTimeUtc: now,
              expiresTimeUtc: now + SOFT_DELETE_RETENTION_MS,
              canRestore: true,
            });
            expect(typeof page.list[0].deletedTimeUtc).toBe("number");
            now += 14_999;
            expect(
              await repository().undoDelete(
                id,
                receipt.expectedDeletedTimeUtc,
                1
              )
            ).toBe(id);
            const restored = await repository().findById(id);
            expect(restored).toMatchObject({
              id,
              isEnabled: resource === "role",
            });
            expect(await repository().findDeletedById(id)).toBeNull();
            expect(
              await repository().undoDelete(
                id,
                receipt.expectedDeletedTimeUtc,
                1
              )
            ).toBeNull();
          });
        });
        it("rejects exactly fifteen seconds and never extends a deletion on repeated or stale writes", async () => {
          await harness.run(async () => {
            const id = await insert("synthetic-boundary");
            const receipt = await repository().onDeleteWithUndo(id, null, 1);
            now += 100;
            await expect(
              repository().onDeleteWithUndo(id, null, 1)
            ).rejects.toMatchObject({ code: code.NOT_ACTIVE });
            expect(
              (await repository().findDeletedById(id))?.deletedTimeUtc
            ).toBe(receipt.expectedDeletedTimeUtc);
            now = receipt.expectedDeletedTimeUtc + 15_000;
            expect(
              await repository().undoDelete(
                id,
                receipt.expectedDeletedTimeUtc,
                1
              )
            ).toBeNull();
            now += 1;
            expect(
              await repository().undoDelete(
                id,
                receipt.expectedDeletedTimeUtc + 1,
                1
              )
            ).toBeNull();
            expect(
              await purge(id, receipt.expectedDeletedTimeUtc + 1)
            ).toBeNull();
            expect(await repository().findDeletedById(id)).not.toBeNull();
          });
        });
        it("reports unique-name conflicts without replacing the new record", async () => {
          await harness.run(async () => {
            const oldId = await insert("synthetic-reused");
            const deleted = await repository().onDeleteWithUndo(oldId, null, 1);
            const newId = await insert("synthetic-reused");
            now += 1;
            await expect(
              repository().undoDelete(oldId, deleted.expectedDeletedTimeUtc, 1)
            ).rejects.toMatchObject({ code: code.NAME_CONFLICT });
            expect(await repository().findById(newId)).not.toBeNull();
            expect(await repository().findDeletedById(oldId)).not.toBeNull();
          });
        });
        it("checks the deleting actor and current deletion permissions after revocation", async () => {
          await harness.run(async () => {
            const permissionRole = await role("synthetic-delete-authority");
            await harness.query(
              sql`INSERT INTO system_permission(id,name,code,category,is_enabled,creator_id,create_time_utc) VALUES(1,'synthetic',${`admin.system.${resource}:delete`},'synthetic',TRUE,1,1)`,
              true
            );
            await harness.query(
              sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc) VALUES(${permissionRole},1,1,1)`,
              true
            );
            await harness.query(
              sql`UPDATE "system_user" SET role_id_arr=${JSON.stringify([permissionRole])}::jsonb WHERE id IN (11,12)`,
              true
            );
            const id = await insert("synthetic-authorization");
            const receipt = await repository().onDeleteWithUndo(id, null, 11);
            expect(
              await repository().undoDelete(
                id,
                receipt.expectedDeletedTimeUtc,
                12
              )
            ).toBeNull();
            await harness.query(
              sql`UPDATE system_role SET is_enabled=FALSE WHERE id=${permissionRole}`,
              true
            );
            await expect(
              repository().undoDelete(id, receipt.expectedDeletedTimeUtc, 11)
            ).rejects.toMatchObject({ code: RecycleBinUndoError.FORBIDDEN });
            const otherId = await insert("synthetic-no-authority");
            await expect(
              repository().onDeleteWithUndo(otherId, null, 11)
            ).rejects.toMatchObject({
              code: BusinessErrorCode.PERMISSION_DENIED,
            });
            expect(await repository().findById(otherId)).not.toBeNull();
          });
        });
        it("requires a current super administrator for permanent deletion", async () => {
          await harness.run(async () => {
            const id = await insert("synthetic-purge-authority");
            const receipt = await repository().onDeleteWithUndo(id, null, 1);
            await expect(
              purge(id, receipt.expectedDeletedTimeUtc, 11)
            ).rejects.toMatchObject({
              code: BusinessErrorCode.PERMISSION_DENIED,
            });
            expect(await purge(id, receipt.expectedDeletedTimeUtc)).toBe(id);
            expect(await repository().findDeletedById(id)).toBeNull();
          });
        });
        it("evaluates expiry after waiting for the shared write lock", async () => {
          const id = await harness.run(() => insert("synthetic-queued-undo"));
          const receipt = await harness.run(() =>
            repository().onDeleteWithUndo(id, null, 1)
          );
          let ready!: () => void;
          let release!: () => void;
          const acquired = new Promise<void>((resolve) => {
            ready = resolve;
          });
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          const blocker = harness.run(() =>
            withPostgresTransaction(
              async () => {
                ready();
                await gate;
              },
              { write: true }
            )
          );
          await acquired;
          const undo = harness.run(() =>
            repository().undoDelete(id, receipt.expectedDeletedTimeUtc, 1)
          );
          now = receipt.expectedDeletedTimeUtc + 15_000;
          release();
          await blocker;
          expect(await undo).toBeNull();
          expect(
            (
              await harness.run(
                async () => await repository().findDeletedById(id)
              )
            )?.deletedTimeUtc
          ).toBe(receipt.expectedDeletedTimeUtc);
        });
        it("rechecks authority after waiting for a concurrent revocation", async () => {
          const id = await harness.run(() =>
            insert("synthetic-queued-revocation")
          );
          const receipt = await harness.run(() =>
            repository().onDeleteWithUndo(id, null, 1)
          );
          let ready!: () => void;
          let release!: () => void;
          const acquired = new Promise<void>((resolve) => {
            ready = resolve;
          });
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          const blocker = harness.run(() =>
            withPostgresTransaction(
              async () => {
                await harness.query(
                  sql`UPDATE "system_user" SET is_enabled=FALSE WHERE id=1`,
                  true
                );
                ready();
                await gate;
              },
              { write: true }
            )
          );
          await acquired;
          const undo = harness.run(() =>
            repository().undoDelete(id, receipt.expectedDeletedTimeUtc, 1)
          );
          const assertion = expect(undo).rejects.toMatchObject({
            code: RecycleBinUndoError.FORBIDDEN,
          });
          release();
          await blocker;
          await assertion;
          const [state] = await harness.query(
            sql`SELECT is_deleted FROM ${table()} WHERE id=${id}`
          );
          expect(state.is_deleted).toBe(true);
        });
      });
    }
    it("uses explicit PostgreSQL facades and preserves department tree and user reference rules", async () => {
      await harness.run(async () => {
        const parent = await department("synthetic-parent");
        const child = await department("synthetic-child", parent);
        expect(await departmentFacade.getTreeData()).toHaveLength(2);
        expect(await departmentFacade.getDepartmentNameById(child)).toBe(
          "synthetic-child"
        );
        await expect(
          departments.onDeleteWithUndo(parent, null, 1)
        ).rejects.toMatchObject({
          code: DepartmentDeletionError.HAS_REFERENCES,
        });
        const childReceipt = await departments.onDeleteWithUndo(child, null, 1);
        await expect(
          departments.onInsert({
            name: "invalid-child",
            parentId: child,
            isEnabled: true,
            creatorId: 1,
            isDeleted: false,
            deletedTimeUtc: null,
            deleterId: null,
          })
        ).rejects.toMatchObject({
          code: DepartmentDeletionError.INVALID_PARENT,
        });
        const parentReceipt = await departments.onDeleteWithUndo(
          parent,
          null,
          1
        );
        expect(
          await departments.undoDelete(
            child,
            childReceipt.expectedDeletedTimeUtc,
            1
          )
        ).toBeNull();
        expect(
          await departments.purge(
            parent,
            parentReceipt.expectedDeletedTimeUtc,
            1
          )
        ).toBeNull();
        expect(
          await departments.purge(child, childReceipt.expectedDeletedTimeUtc, 1)
        ).toBe(child);
        expect(
          await departments.purge(
            parent,
            parentReceipt.expectedDeletedTimeUtc,
            1
          )
        ).toBe(parent);
      });
    });
    it("blocks disabled users and disabled roles that still reference departments or roles", async () => {
      await harness.run(async () => {
        const departmentId = await department("synthetic-referenced");
        await harness.query(
          sql`UPDATE "system_user" SET department_id=${departmentId},is_enabled=FALSE WHERE id=11`,
          true
        );
        await expect(
          departments.onDeleteWithUndo(departmentId, null, 1)
        ).rejects.toMatchObject({
          code: DepartmentDeletionError.HAS_REFERENCES,
        });
        await harness.query(
          sql`UPDATE "system_user" SET department_id=NULL WHERE id=11`,
          true
        );
        const roleId = await role(
          "synthetic-department-scope",
          JSON.stringify([departmentId])
        );
        await harness.query(
          sql`UPDATE system_role SET is_enabled=FALSE WHERE id=${roleId}`,
          true
        );
        await expect(
          departments.onDeleteWithUndo(departmentId, null, 1)
        ).rejects.toMatchObject({
          code: DepartmentDeletionError.HAS_REFERENCES,
        });
        await harness.query(
          sql`UPDATE "system_user" SET role_id_arr=${JSON.stringify([roleId])}::jsonb WHERE id=11`,
          true
        );
        await expect(
          roles.onDeleteWithUndo(roleId, null, 1)
        ).rejects.toMatchObject({ code: RoleDeletionError.HAS_REFERENCES });
        expect(await roleFacade.findById(roleId)).not.toBeNull();
      });
    });
    it("restores roles only with valid department scopes and keeps bindings on rejected purges", async () => {
      await harness.run(async () => {
        const departmentId = await department("synthetic-saved-department");
        const roleId = await role(
          "synthetic-saved-role",
          JSON.stringify([departmentId])
        );
        const deletedRole = await roles.onDeleteWithUndo(roleId, null, 1);
        await harness.query(
          sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc) VALUES(${roleId},999,1,1)`,
          true
        );
        const deletedDepartment = await departments.onDeleteWithUndo(
          departmentId,
          null,
          1
        );
        expect((await roles.findUndoState(roleId))?.departmentsAvailable).toBe(
          0
        );
        expect(
          await roles.undoDelete(roleId, deletedRole.expectedDeletedTimeUtc, 1)
        ).toBeNull();
        expect(
          await roles.purge(
            roleId,
            deletedRole.expectedDeletedTimeUtc + 1,
            undefined,
            1
          )
        ).toBeNull();
        expect(
          await harness.query(
            sql`SELECT id FROM system_role_permission WHERE role_id=${roleId}`
          )
        ).toHaveLength(1);
        now += 1;
        expect(
          await departments.undoDelete(
            departmentId,
            deletedDepartment.expectedDeletedTimeUtc,
            1
          )
        ).toBe(departmentId);
        expect(
          await roles.undoDelete(roleId, deletedRole.expectedDeletedTimeUtc, 1)
        ).toBe(roleId);
        expect((await roles.findById(roleId))?.permissionCount).toBe(1);
      });
    });
    it("honors the exact thirty-day boundary and clears role bindings in the same transaction", async () => {
      await harness.run(async () => {
        const departmentId = await department("synthetic-expired-department");
        const roleId = await role("synthetic-expired-role");
        const deletedDepartment = await departments.onDeleteWithUndo(
          departmentId,
          null,
          1
        );
        const deletedRole = await roles.onDeleteWithUndo(roleId, null, 1);
        await harness.query(
          sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc) VALUES(${roleId},999,1,1)`,
          true
        );
        now += SOFT_DELETE_RETENTION_MS;
        expect(
          await departments.restore(
            departmentId,
            deletedDepartment.expectedDeletedTimeUtc,
            1,
            now - 1
          )
        ).toBeNull();
        expect(
          await roles.restore(roleId, deletedRole.expectedDeletedTimeUtc, 1)
        ).toBeNull();
        expect(await purgeExpiredDepartments({ now, batchSize: 100 })).toEqual({
          deletedCount: 1,
          remainingExpired: 0,
          oldestExpiredTimeUtc: null,
        });
        expect(await purgeExpiredRoles({ now, batchSize: 100 })).toEqual({
          deletedCount: 1,
          remainingExpired: 0,
          oldestExpiredTimeUtc: null,
        });
        expect(
          await harness.query(
            sql`SELECT id FROM system_role_permission WHERE role_id=${roleId}`
          )
        ).toHaveLength(0);
        expect(await purgeExpiredRoles({ now, batchSize: 100 })).toEqual({
          deletedCount: 0,
          remainingExpired: 0,
          oldestExpiredTimeUtc: null,
        });
      });
    });
    it("caps each cleanup batch and reports blocked overdue departments", async () => {
      await harness.run(async () => {
        const base = now;
        await harness.query(
          sql`INSERT INTO system_department(name,is_enabled,creator_id,create_time_utc,is_deleted,deleted_time_utc,deleter_id)
        SELECT 'synthetic-batch-'||n,FALSE,1,1,TRUE,${base},1 FROM generate_series(1,103) AS n`,
          true
        );
        await harness.query(
          sql`UPDATE "system_user" SET department_id=(SELECT id FROM system_department ORDER BY id LIMIT 1),is_enabled=FALSE WHERE id=11`,
          true
        );
        now += SOFT_DELETE_RETENTION_MS;
        expect(await purgeExpiredDepartments({ now, batchSize: 1000 })).toEqual(
          { deletedCount: 100, remainingExpired: 3, oldestExpiredTimeUtc: now }
        );
        expect(await purgeExpiredDepartments({ now, batchSize: 100 })).toEqual({
          deletedCount: 2,
          remainingExpired: 1,
          oldestExpiredTimeUtc: now,
        });
        expect(await purgeExpiredDepartments({ now, batchSize: 100 })).toEqual({
          deletedCount: 0,
          remainingExpired: 1,
          oldestExpiredTimeUtc: now,
        });
        await harness.query(
          sql`UPDATE "system_user" SET department_id=NULL WHERE id=11`,
          true
        );
        expect(
          (await purgeExpiredDepartments({ now, batchSize: 100 })).deletedCount
        ).toBe(1);
      });
    });
    it("rolls back role-binding deletion when a physical role deletion fails, then retries", async () => {
      let roleId = 0;
      let deletedTime = 0;
      await harness.run(async () => {
        roleId = await role("synthetic-rollback-role");
        deletedTime = (await roles.onDeleteWithUndo(roleId, null, 1))
          .expectedDeletedTimeUtc;
        await harness.query(
          sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc) VALUES(${roleId},999,1,1)`,
          true
        );
        await harness.query(
          sql`CREATE FUNCTION reject_synthetic_role_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic delete failure'; END $$`,
          true
        );
        await harness.query(
          sql`CREATE TRIGGER reject_synthetic_role_delete BEFORE DELETE ON system_role FOR EACH ROW EXECUTE FUNCTION reject_synthetic_role_delete()`,
          true
        );
      });
      await expect(
        harness.run(() => roles.purge(roleId, deletedTime, undefined, 1))
      ).rejects.toThrow();
      expect(
        await harness.query(
          sql`SELECT id FROM system_role_permission WHERE role_id=${roleId}`
        )
      ).toHaveLength(1);
      expect(
        await harness.run(() => roles.findDeletedById(roleId))
      ).not.toBeNull();
      now += SOFT_DELETE_RETENTION_MS;
      await expect(
        harness.run(() => purgeExpiredRoles({ now, batchSize: 100 }))
      ).rejects.toThrow();
      expect(
        await harness.query(
          sql`SELECT id FROM system_role_permission WHERE role_id=${roleId}`
        )
      ).toHaveLength(1);
      await harness.query(
        sql`DROP TRIGGER reject_synthetic_role_delete ON system_role`,
        true
      );
      await harness.query(
        sql`DROP FUNCTION reject_synthetic_role_delete()`,
        true
      );
      expect(
        await harness.run(() => purgeExpiredRoles({ now, batchSize: 100 }))
      ).toEqual({
        deletedCount: 1,
        remainingExpired: 0,
        oldestExpiredTimeUtc: null,
      });
    });
    it("serializes restore and cleanup so a recovered record cannot be purged by a stale cleanup", async () => {
      const id = await harness.run(() => department("synthetic-restore-race"));
      const receipt = await harness.run(() =>
        departments.onDeleteWithUndo(id, null, 1)
      );
      now = receipt.expectedDeletedTimeUtc + SOFT_DELETE_RETENTION_MS - 1;
      const restore = harness.run(() =>
        departments.restore(id, receipt.expectedDeletedTimeUtc, 1, now)
      );
      const cleanup = harness.run(() =>
        purgeExpiredDepartments({ now: now + 1, batchSize: 100 })
      );
      const [restored, cleaned] = await Promise.all([restore, cleanup]);
      if (restored === id) {
        expect(cleaned.deletedCount).toBe(0);
        expect(
          await harness.run(() => departments.findById(id))
        ).not.toBeNull();
      } else {
        expect(cleaned.deletedCount).toBe(1);
        expect(
          await harness.run(() => departments.findDeletedById(id))
        ).toBeNull();
      }
    });
    it("caps role cleanup and never drops retained bindings outside the selected deletion versions", async () => {
      await harness.run(async () => {
        const base = now;
        await harness.query(
          sql`INSERT INTO system_role(name,is_enabled,permission_count,data_scope,creator_id,create_time_utc,is_deleted,deleted_time_utc,deleter_id)
        SELECT 'synthetic-role-batch-'||n,FALSE,1,'all',1,1,TRUE,${base},1 FROM generate_series(1,103) AS n`,
          true
        );
        await harness.query(
          sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc) SELECT id,999,1,1 FROM system_role WHERE is_deleted`,
          true
        );
        now += SOFT_DELETE_RETENTION_MS;
        expect(await purgeExpiredRoles({ now, batchSize: 1000 })).toEqual({
          deletedCount: 100,
          remainingExpired: 3,
          oldestExpiredTimeUtc: now,
        });
        expect(
          await harness.query(
            sql`SELECT id FROM system_role_permission WHERE permission_id=999`
          )
        ).toHaveLength(3);
        expect(await purgeExpiredRoles({ now, batchSize: 100 })).toEqual({
          deletedCount: 3,
          remainingExpired: 0,
          oldestExpiredTimeUtc: null,
        });
        expect(
          await harness.query(
            sql`SELECT id FROM system_role_permission WHERE permission_id=999`
          )
        ).toHaveLength(0);
      });
    });
    it("rechecks restore authority inside the transaction after current roles are revoked", async () => {
      await harness.run(async () => {
        const id = await department("synthetic-restore-permission");
        const receipt = await departments.onDeleteWithUndo(id, null, 1);
        await harness.query(
          sql`UPDATE "system_user" SET role_id_arr='[]'::jsonb WHERE id=1`,
          true
        );
        await expect(
          departments.restore(id, receipt.expectedDeletedTimeUtc, 1, now)
        ).rejects.toMatchObject({
          code: BusinessErrorCode.PERMISSION_DENIED,
        });
        await expect(
          departments.purge(id, receipt.expectedDeletedTimeUtc, 1)
        ).rejects.toMatchObject({
          code: BusinessErrorCode.PERMISSION_DENIED,
        });
        expect(await departments.findDeletedById(id)).not.toBeNull();
      });
    });
  }
);
