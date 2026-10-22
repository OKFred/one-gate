import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq, sql, type SQL } from "drizzle-orm";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../../../../apps/server/test/postgresql";
import {
  getPostgresDb,
  withPostgresTransaction,
  withPostgresWriteCheck,
} from "@hodor/core/db/postgresql/runtime";
import { assertPostgresAuthority } from "@hodor/core/middleware/auth/permission";
import { BusinessErrorCode } from "@hodor/core/middleware/errorHandler/businessError";
import type { UserObj } from "@hodor/core/types/app";
import { tenantRepository } from "./repository";
import {
  getTenantContext,
  getMappingContext,
  type TenantContext,
} from "./context";
import { TenantError } from "./errors";
import { tenantTable, tenantMemberTable } from "./schema.pg";
import { assetRepository as assets } from "../asset/repository";
import assetService, { normalizeIdentifier } from "../asset/service";
import { AssetError } from "../asset/errors";
import { rolePermissionRepository as rolePermissions } from "@hodor/admin/system/role_permission/repository";
import { RoleDeletionError } from "@hodor/admin/system/role/errors";

vi.mock("@hodor/admin/common/registry", async () => {
  const { systemAccess } = await import("@hodor/admin/system/access-metadata");
  return { registry: { system: { access: systemAccess } } };
});

function actor(userId: number): UserObj {
  return {
    principal: { kind: "user", userId },
    id: userId,
    userId,
    username: `synthetic-pg-user-${userId}`,
    langCode: "en-US",
    isEnabled: true,
    token: "synthetic-token",
    isSuperAdmin: userId === 1,
    roleIds: userId === 1 ? [1] : [],
    permissions: [],
    dataScope: "self_only",
    customDeptIds: [],
    ensureLoaded: async () => undefined,
  };
}
const principal = (userId: number) => ({ kind: "user", userId }) as const;
const source = {
  sourceSystem: "synthetic-collector",
  collectorId: "host-a",
  deviceId: "disk-a",
  metric: "temperature",
  channel: "disk",
};

describe.skipIf(!postgresTestsConfigured)(
  "real PostgreSQL enterprise and asset authorization",
  () => {
    let harness: PostgresTestHarness;
    let a: TenantContext;
    let b: TenantContext;
    let start: number;
    beforeAll(async () => {
      harness = await createPostgresTestHarness("enterprise_tests");
    });
    afterAll(async () => {
      await harness?.close();
    });
    beforeEach(async () => {
      await harness.reset();
      await harness.seedEnterpriseIdentities();
      start = Date.now() - 60_000;
      const aId = await harness.run(() =>
        tenantRepository.create(
          { key: "synthetic-a", name: "Synthetic A", ownerUserId: 11 },
          principal(1)
        )
      );
      const bId = await harness.run(() =>
        tenantRepository.create(
          { key: "synthetic-b", name: "Synthetic B", ownerUserId: 21 },
          principal(1)
        )
      );
      a = { tenantId: aId, principal: principal(11), capability: "edit" };
      b = { tenantId: bId, principal: principal(21), capability: "edit" };
    });
    async function member(
      userId: number,
      role: "owner" | "admin" | "editor" | "viewer",
      ctx = a
    ) {
      return tenantRepository.memberSet(
        {
          tenantId: ctx.tenantId,
          userId,
          role,
          isEnabled: true,
          expectedUpdateTimeUtc: null,
        },
        { ...ctx, capability: "manage" }
      );
    }
    async function company(id = a.tenantId) {
      return withPostgresTransaction(
        async () =>
          (
            await getPostgresDb()
              .select()
              .from(tenantTable)
              .where(eq(tenantTable.id, id))
          )[0]
      );
    }
    async function currentMember(userId: number, ctx = a) {
      return withPostgresTransaction(
        async () =>
          (
            await getPostgresDb()
              .select()
              .from(tenantMemberTable)
              .where(
                sql`${tenantMemberTable.tenantId} = ${ctx.tenantId} AND ${tenantMemberTable.userId} = ${userId}`
              )
          )[0]
      );
    }
    async function add(
      ctx = a,
      code?: string,
      category: "disk" | "host" = "disk"
    ) {
      return assets.add(ctx, {
        tenantId: ctx.tenantId,
        name: "Synthetic asset",
        category,
        assetCode: code,
      });
    }
    async function version(id: number, ctx = a) {
      return (await assets.findById(ctx, id))?.updateTimeUtc ?? null;
    }
    async function bind(id: number, from = start, ctx = a) {
      return assets.bind(ctx, {
        tenantId: ctx.tenantId,
        assetId: id,
        ...source,
        validFromUtc: from,
        reason: "Synthetic binding",
        expectedAssetUpdateTimeUtc: await version(id, ctx),
      });
    }
    async function addToken(id = 101) {
      await harness.query(
        sql`INSERT INTO system_api_token (id,name,token_prefix,token_hash,permissions,status,creator_id,create_time_utc)
    VALUES (${id}, 'synthetic-token', 'test', ${`synthetic-hash-${id}`}, '["enterprise.asset.mapping:read"]', 'active', 11, 1)`,
        true
      );
    }
    async function revokeWhileWaiting<T>(
      revoke: SQL,
      operation: () => Promise<T>
    ): Promise<PromiseSettledResult<T>> {
      let release: () => void = () => undefined;
      let locked: () => void = () => undefined;
      const ready = new Promise<void>((resolve) => {
        locked = resolve;
      });
      const resume = new Promise<void>((resolve) => {
        release = resolve;
      });
      const blocker = harness.run(() =>
        withPostgresTransaction(
          async () => {
            locked();
            await resume;
            await getPostgresDb().execute(revoke);
          },
          { write: true }
        )
      );
      await ready;
      const pending = harness.run(operation).then(
        (value): PromiseFulfilledResult<T> => ({ status: "fulfilled", value }),
        (reason: unknown): PromiseRejectedResult => ({
          status: "rejected",
          reason,
        })
      );
      try {
        // Observe the actual lock wait before committing revocation; no timing assumption.
        await expect
          .poll(
            async () => {
              const [row] = await harness.query<{ count: number }>(
                sql`SELECT COUNT(*)::integer AS count FROM pg_stat_activity
              WHERE application_name = ${harness.schema}
                AND wait_event_type = 'Lock' AND query LIKE '%one_gate_write_guard%'`
              );
              return row.count;
            },
            { timeout: 5000, interval: 10 }
          )
          .toBeGreaterThan(0);
      } finally {
        release();
        await blocker;
      }
      return pending;
    }

    it("rejects an asset write when its system permission is revoked while queued", async () => {
      const context = await harness.run(() =>
        getTenantContext(a.tenantId, actor(11), "edit", "enterprise.asset:add")
      );
      const result = await revokeWhileWaiting(
        sql`DELETE FROM system_role_permission WHERE role_id = 2
          AND permission_id = (SELECT id FROM system_permission WHERE code = 'enterprise.asset:add')`,
        () => add(context)
      );
      expect(result).toMatchObject({
        status: "rejected",
        reason: { message: AssetError.STATE_CONFLICT },
      });
      const [count] = await harness.query<{ count: number }>(
        sql`SELECT COUNT(*)::integer AS count FROM enterprise_asset`
      );
      expect(count.count).toBe(0);
    });

    it("rejects a member write when the acting system role is disabled while queued", async () => {
      const context = await harness.run(() =>
        getTenantContext(
          a.tenantId,
          actor(11),
          "manage",
          "enterprise.tenant:edit"
        )
      );
      const result = await revokeWhileWaiting(
        sql`UPDATE system_role SET is_enabled = FALSE WHERE id = 2`,
        () =>
          tenantRepository.memberSet(
            {
              tenantId: a.tenantId,
              userId: 12,
              role: "editor",
              isEnabled: true,
              expectedUpdateTimeUtc: null,
            },
            context
          )
      );
      expect(result).toMatchObject({
        status: "rejected",
        reason: { message: TenantError.STATE_CONFLICT },
      });
      const rows = await harness.query(
        sql`SELECT id FROM enterprise_tenant_member WHERE tenant_id = ${a.tenantId} AND user_id = 12`
      );
      expect(rows).toEqual([]);
    });

    it("rechecks HTTP authority after the lock before changing role permissions", async () => {
      await harness.query(
        sql`INSERT INTO system_role(id,name,is_enabled,permission_count,data_scope,creator_id,create_time_utc,is_deleted)
          VALUES (20,'synthetic-authorization-target',TRUE,0,'all',1,1,FALSE);
          INSERT INTO system_permission(id,code,name,category,is_enabled,creator_id,create_time_utc)
          VALUES (50,'synthetic:queued','Synthetic queued permission','action',TRUE,1,1)`,
        true
      );
      const result = await revokeWhileWaiting(
        sql`DELETE FROM system_role_permission WHERE role_id = 2
          AND permission_id = (SELECT id FROM system_permission WHERE code = 'admin.system.role_permission:add')`,
        () =>
          withPostgresWriteCheck(
            () =>
              assertPostgresAuthority(
                actor(11),
                "add",
                "admin.system.role_permission"
              ),
            () =>
              rolePermissions.onInsert({
                roleId: 20,
                permissionId: 50,
                creatorId: 11,
              })
          )
      );
      expect(result).toMatchObject({
        status: "rejected",
        reason: { message: BusinessErrorCode.PERMISSION_DENIED },
      });
      const rows = await harness.query(
        sql`SELECT id FROM system_role_permission WHERE role_id = 20`
      );
      expect(rows).toEqual([]);
      const [role] = await harness.query(
        sql`SELECT permission_count::integer AS permission_count FROM system_role WHERE id = 20`
      );
      expect(role.permission_count).toBe(0);
    });

    it("rechecks permission state for reads and never treats the tenant role as a system grant", () =>
      harness.run(async () => {
        const read = await getTenantContext(
          a.tenantId,
          actor(11),
          "read",
          "enterprise.asset:read"
        );
        await harness.query(
          sql`UPDATE system_permission SET is_enabled = FALSE WHERE code IN ('enterprise.asset:read', 'enterprise.tenant:read')`,
          true
        );
        expect(
          (await assets.findPage(read, { tenantId: a.tenantId })).total
        ).toBe(0);
        expect((await tenantRepository.list({}, principal(11))).total).toBe(0);
        await expect(
          getTenantContext(
            a.tenantId,
            actor(11),
            "read",
            "enterprise.asset:read"
          )
        ).rejects.toMatchObject({ message: TenantError.NOT_VISIBLE });
        await harness.query(
          sql`UPDATE "system_user" SET role_id_arr = '["2"]'::jsonb WHERE id = 11`,
          true
        );
        await expect(
          getMappingContext(
            a.tenantId,
            actor(11),
            "enterprise.asset.mapping:read"
          )
        ).rejects.toMatchObject({ message: TenantError.NOT_VISIBLE });
        await harness.query(
          sql`UPDATE "system_user" SET role_id_arr = '[2]'::jsonb WHERE id = 11`,
          true
        );
        await expect(
          getMappingContext(
            a.tenantId,
            actor(11),
            "enterprise.asset.mapping:read"
          )
        ).resolves.toMatchObject({ principal: principal(11) });
      }));

    it("retains the route permission aliases when rechecking human access", () =>
      harness.run(async () => {
        await harness.query(
          sql`UPDATE system_permission SET code = 'enterprise.asset:list' WHERE code = 'enterprise.asset:read'`,
          true
        );
        await harness.query(
          sql`UPDATE system_permission SET code = 'enterprise.tenant:view' WHERE code = 'enterprise.tenant:read'`,
          true
        );
        await harness.query(
          sql`UPDATE system_permission SET code = 'enterprise.asset.mapping:get' WHERE code = 'enterprise.asset.mapping:read'`,
          true
        );
        await expect(
          getTenantContext(
            a.tenantId,
            actor(11),
            "read",
            "enterprise.asset:read"
          )
        ).resolves.toMatchObject({ principal: principal(11) });
        expect((await tenantRepository.list({}, principal(11))).total).toBe(1);
        await expect(
          getMappingContext(
            a.tenantId,
            actor(11),
            "enterprise.asset.mapping:read"
          )
        ).resolves.toMatchObject({ principal: principal(11) });
      }));

    it("creates owners atomically, keeps platform membership explicit and lists only own tenants", () =>
      harness.run(async () => {
        expect((await currentMember(11)).role).toBe("owner");
        expect(
          (await tenantRepository.list({}, principal(11))).list.map(
            (value) => value.id
          )
        ).toEqual([a.tenantId]);
        expect(
          (await tenantRepository.list({}, principal(1), true)).list
        ).toHaveLength(2);
        await expect(
          getTenantContext(a.tenantId, actor(1), "read")
        ).rejects.toMatchObject({ message: TenantError.NOT_VISIBLE });
        await expect(
          tenantRepository.create(
            { key: "synthetic-a", name: "Conflicting", ownerUserId: 11 },
            principal(1)
          )
        ).rejects.toMatchObject({ message: TenantError.KEY_CONFLICT });
      }));
    it("isolates asset counts, search and detail while allowing the same code in another enterprise", () =>
      harness.run(async () => {
        const first = await add(a, "CODE-1");
        await add(b, "CODE-1");
        expect(
          (
            await assets.findPage(a, {
              tenantId: a.tenantId,
              keyword: "CODE-1",
            })
          ).total
        ).toBe(1);
        expect(await assets.findById(b, first)).toBeNull();
        expect(await assets.findById(b, 999999)).toBeNull();
        await expect(add(a, "CODE-1")).rejects.toMatchObject({
          message: AssetError.CODE_CONFLICT,
        });
      }));
    it("enforces viewer/editor/admin abilities and prevents an admin from changing owners", () =>
      harness.run(async () => {
        await member(12, "viewer");
        await member(13, "editor");
        await member(14, "admin");
        const viewer = await getTenantContext(a.tenantId, actor(12), "read");
        expect(
          (await assets.findPage(viewer, { tenantId: a.tenantId })).total
        ).toBe(0);
        await expect(
          assets.add(viewer, {
            tenantId: a.tenantId,
            name: "No write",
            category: "disk",
          })
        ).rejects.toBeDefined();
        await expect(
          getTenantContext(a.tenantId, actor(13), "manage")
        ).rejects.toMatchObject({ message: TenantError.NOT_VISIBLE });
        const admin = await getTenantContext(a.tenantId, actor(14), "manage");
        const own = await currentMember(14);
        await expect(
          tenantRepository.memberSet(
            {
              tenantId: a.tenantId,
              userId: 14,
              role: "owner",
              isEnabled: true,
              expectedUpdateTimeUtc: own.updateTimeUtc,
            },
            admin
          )
        ).rejects.toMatchObject({ message: TenantError.STATE_CONFLICT });
        const owner = await currentMember(11);
        await expect(
          tenantRepository.memberSet(
            {
              tenantId: a.tenantId,
              userId: 11,
              role: "viewer",
              isEnabled: true,
              expectedUpdateTimeUtc: owner.updateTimeUtc,
            },
            admin
          )
        ).rejects.toMatchObject({ message: TenantError.STATE_CONFLICT });
      }));
    it("serializes two owner demotions without removing the last effective owner", () =>
      harness.run(async () => {
        await member(12, "owner");
        const first = await currentMember(11);
        const second = await currentMember(12);
        const results = await Promise.allSettled([
          tenantRepository.memberSet(
            {
              tenantId: a.tenantId,
              userId: 11,
              role: "viewer",
              isEnabled: true,
              expectedUpdateTimeUtc: first.updateTimeUtc,
            },
            { ...a, principal: principal(12), capability: "manage" }
          ),
          tenantRepository.memberSet(
            {
              tenantId: a.tenantId,
              userId: 12,
              role: "viewer",
              isEnabled: true,
              expectedUpdateTimeUtc: second.updateTimeUtc,
            },
            { ...a, capability: "manage" }
          ),
        ]);
        expect(
          results.filter((result) => result.status === "fulfilled")
        ).toHaveLength(1);
        const remaining = await harness.query(
          sql`SELECT id FROM enterprise_tenant_member WHERE tenant_id = ${a.tenantId} AND role = 'owner' AND is_enabled`
        );
        expect(remaining).toHaveLength(1);
      }));
    it("rolls back an owner promotion when a later demotion affects zero rows", async () => {
      await harness.run(() => member(12, "admin"));
      await harness.query(
        sql.raw(
          `CREATE FUNCTION reject_test_owner_demotion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.user_id = 11 AND NEW.role = 'admin' THEN RETURN NULL; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_test_owner BEFORE UPDATE ON enterprise_tenant_member FOR EACH ROW EXECUTE FUNCTION reject_test_owner_demotion()`
        ),
        true
      );
      try {
        await harness.run(async () => {
          const first = await currentMember(11);
          const target = await currentMember(12);
          await expect(
            tenantRepository.transferOwner(
              {
                tenantId: a.tenantId,
                toUserId: 12,
                expectedSourceTimeUtc: first.updateTimeUtc,
                expectedTargetTimeUtc: target.updateTimeUtc,
              },
              { ...a, capability: "manage" }
            )
          ).rejects.toMatchObject({ message: TenantError.STATE_CONFLICT });
          expect((await currentMember(11)).role).toBe("owner");
          expect((await currentMember(12)).role).toBe("admin");
        });
      } finally {
        await harness.query(
          sql.raw("DROP FUNCTION reject_test_owner_demotion() CASCADE"),
          true
        );
      }
    });
    it("freezes disabled global owners and records explicit platform recovery", () =>
      harness.run(async () => {
        await harness.query(
          sql`UPDATE "system_user" SET is_enabled = FALSE WHERE id = 11`,
          true
        );
        await expect(
          getTenantContext(a.tenantId, actor(11), "read")
        ).rejects.toMatchObject({ message: TenantError.NOT_VISIBLE });
        const tenant = await company();
        expect(
          (await tenantRepository.list({}, principal(1), true)).list.find(
            (value) => value.id === a.tenantId
          )?.frozen
        ).toBe(true);
        await tenantRepository.recoverOwner(
          {
            tenantId: a.tenantId,
            userId: 12,
            reason: "Synthetic recovery",
            expectedUpdateTimeUtc: tenant.updateTimeUtc,
          },
          principal(1)
        );
        expect((await currentMember(12)).role).toBe("owner");
        expect((await company()).recoveryReason).toBe("Synthetic recovery");
        await expect(
          getTenantContext(a.tenantId, actor(12), "edit")
        ).resolves.toMatchObject({ tenantId: a.tenantId });
      }));
    it("uses current token grants, permission validity and owner status for machine reads", async () => {
      await addToken();
      await harness.run(async () => {
        const machine = {
          ...actor(11),
          principal: { kind: "api_token", tokenId: 101 } as const,
        };
        await expect(
          getMappingContext(a.tenantId, machine)
        ).rejects.toMatchObject({ message: TenantError.NOT_VISIBLE });
        await tenantRepository.tokenGrantSet(
          {
            tenantId: a.tenantId,
            tokenId: 101,
            isEnabled: true,
            expectedUpdateTimeUtc: null,
          },
          { ...a, capability: "manage" },
          101
        );
        const machineContext = await getMappingContext(a.tenantId, machine);
        expect(machineContext.principal.kind).toBe("api_token");
        await expect(
          getMappingContext(b.tenantId, machine)
        ).rejects.toMatchObject({ message: TenantError.NOT_VISIBLE });
        await expect(
          assets.findPage(machineContext, { tenantId: a.tenantId })
        ).rejects.toBeDefined();
        await harness.query(
          sql`UPDATE system_api_token SET permissions = 'invalid json' WHERE id = 101`,
          true
        );
        await expect(
          getMappingContext(a.tenantId, machine)
        ).rejects.toMatchObject({ message: TenantError.NOT_VISIBLE });
        await harness.query(
          sql`UPDATE system_api_token SET permissions = '["enterprise.asset.mapping:read"]' WHERE id = 101`,
          true
        );
        const grant = (
          await tenantRepository.tokenGrants(
            { tenantId: a.tenantId },
            { ...a, capability: "manage" }
          )
        ).list[0];
        await tenantRepository.tokenGrantSet(
          {
            tenantId: a.tenantId,
            tokenId: 101,
            isEnabled: false,
            expectedUpdateTimeUtc: grant.updateTimeUtc,
          },
          { ...a, capability: "manage" },
          null
        );
        await expect(
          getMappingContext(a.tenantId, machine)
        ).rejects.toMatchObject({ message: TenantError.NOT_VISIBLE });
      });
    });
    it("rejects a current permission or tenant revocation despite an earlier context", () =>
      harness.run(async () => {
        const context = await getTenantContext(a.tenantId, actor(11), "edit");
        const tenant = await company();
        await tenantRepository.update(
          {
            tenantId: a.tenantId,
            name: tenant.name,
            isEnabled: false,
            expectedUpdateTimeUtc: tenant.updateTimeUtc,
          },
          principal(1)
        );
        await expect(add(context)).rejects.toMatchObject({
          message: AssetError.STATE_CONFLICT,
        });
        expect(
          (await assets.findPage(context, { tenantId: a.tenantId })).total
        ).toBe(0);
      }));
    it("preserves UUIDs and rolls back parent versions after identifier conflicts", () =>
      harness.run(async () => {
        const first = await add();
        const second = await add();
        const original = await assets.findById(a, first);
        const identifier = (
          assetId: number,
          expectedAssetUpdateTimeUtc: number | null
        ) => ({
          tenantId: a.tenantId,
          assetId,
          expectedAssetUpdateTimeUtc,
          identifierType: "sn" as const,
          namespace: "vendor",
          value: "SYNTHETIC-SN",
          source: "synthetic inventory",
          confidence: "high" as const,
          isVerified: true,
        });
        await assets.addIdentifier(
          a,
          identifier(first, original?.updateTimeUtc ?? null),
          "synthetic-sn"
        );
        const previous = await version(second);
        await expect(
          assets.addIdentifier(a, identifier(second, previous), "synthetic-sn")
        ).rejects.toMatchObject({ message: AssetError.IDENTIFIER_CONFLICT });
        expect(await version(second)).toBe(previous);
        const current = await assets.findById(a, first);
        if (!current) throw new Error("Missing synthetic asset");
        await assets.update(a, {
          tenantId: a.tenantId,
          id: first,
          name: "Renamed",
          category: "disk",
          expectedUpdateTimeUtc: current.updateTimeUtc,
        });
        expect((await assets.findById(a, first))?.assetId).toBe(
          original?.assetId
        );
        expect(() =>
          normalizeIdentifier({ ...identifier(first, null), value: "unknown" })
        ).toThrow();
      }));
    it("keeps installation history, rejects foreign hosts and closes retired asset relationships", () =>
      harness.run(async () => {
        const disk = await add();
        const hostA = await add(a, undefined, "host");
        const hostB = await add(a, undefined, "host");
        const foreignHost = await add(b, undefined, "host");
        const base = {
          tenantId: a.tenantId,
          assetId: disk,
          location: "Synthetic room",
          reason: "Install",
        };
        await expect(
          assets.assign(a, {
            ...base,
            hostAssetId: foreignHost,
            validFromUtc: start,
            expectedAssetUpdateTimeUtc: await version(disk),
          })
        ).rejects.toMatchObject({ message: AssetError.STATE_CONFLICT });
        const first = await assets.assign(a, {
          ...base,
          hostAssetId: hostA,
          validFromUtc: start,
          expectedAssetUpdateTimeUtc: await version(disk),
        });
        await expect(
          assets.retire(a, {
            tenantId: a.tenantId,
            id: hostA,
            expectedUpdateTimeUtc: await version(hostA),
            reason: "Blocked",
          })
        ).rejects.toMatchObject({ message: AssetError.STATE_CONFLICT });
        const prior = (
          await assets.assignments(a, { tenantId: a.tenantId, assetId: disk })
        ).list.find((value) => value.id === first);
        const moved = start + 1000;
        await assets.assign(a, {
          ...base,
          hostAssetId: hostB,
          validFromUtc: moved,
          replacesId: first,
          expectedUpdateTimeUtc: prior?.updateTimeUtc ?? null,
          expectedAssetUpdateTimeUtc: await version(disk),
        });
        expect(
          (
            await assets.assignments(a, { tenantId: a.tenantId, assetId: disk })
          ).list.find((value) => value.id === first)?.validToUtc
        ).toBe(moved);
        await assets.retire(a, {
          tenantId: a.tenantId,
          id: disk,
          expectedUpdateTimeUtc: await version(disk),
          reason: "Synthetic retirement",
        });
        expect(
          (
            await assets.assignments(a, { tenantId: a.tenantId, assetId: disk })
          ).list.every((value) => value.validToUtc !== null)
        ).toBe(true);
        await assets.activate(a, {
          tenantId: a.tenantId,
          id: disk,
          expectedUpdateTimeUtc: await version(disk),
          reason: "Synthetic reactivation",
        });
        expect(
          (
            await assets.assignments(a, { tenantId: a.tenantId, assetId: disk })
          ).list.every((value) => value.validToUtc !== null)
        ).toBe(true);
      }));
    it("serializes a measurement key claimed by different assets", () =>
      harness.run(async () => {
        const first = await add();
        const second = await add();
        const results = await Promise.allSettled([bind(first), bind(second)]);
        expect(
          results.filter((result) => result.status === "fulfilled")
        ).toHaveLength(1);
        expect(
          (await assets.mappingPage(a, { tenantId: a.tenantId })).total
        ).toBe(1);
      }));
    it("resolves old observations across half-open measurement migration boundaries", () =>
      harness.run(async () => {
        const disk = await add();
        const first = await bind(disk);
        const boundary = start + 1000;
        const original = (
          await assets.bindings(a, { tenantId: a.tenantId, assetId: disk })
        ).list[0];
        const second = await assets.bind(a, {
          tenantId: a.tenantId,
          assetId: disk,
          ...source,
          validFromUtc: boundary,
          reason: "Move",
          replacesId: first,
          expectedUpdateTimeUtc: original.updateTimeUtc,
          expectedAssetUpdateTimeUtc: await version(disk),
        });
        const old = await assets.resolve(a, {
          tenantId: a.tenantId,
          ...source,
          observedTimeUtc: boundary - 1,
        });
        const current = await assets.resolve(a, {
          tenantId: a.tenantId,
          ...source,
          observedTimeUtc: boundary,
        });
        expect(old.mapping?.bindingId).toBe(first);
        expect(current.mapping?.bindingId).toBe(second);
        await expect(
          assets.bind(a, {
            tenantId: a.tenantId,
            assetId: disk,
            ...source,
            validFromUtc: start,
            validToUtc: boundary + 1,
            reason: "Overlap",
            expectedAssetUpdateTimeUtc: await version(disk),
          })
        ).rejects.toMatchObject({ message: AssetError.STATE_CONFLICT });
      }));
    it("does not let a stale asset edit overwrite a concurrent edit", () =>
      harness.run(async () => {
        const id = await add();
        const expected = await version(id);
        const results = await Promise.allSettled(
          ["One", "Two"].map((name) =>
            assets.update(a, {
              tenantId: a.tenantId,
              id,
              name,
              category: "disk",
              expectedUpdateTimeUtc: expected,
            })
          )
        );
        expect(
          results.filter((result) => result.status === "fulfilled")
        ).toHaveLength(1);
      }));
    it("routes actual services through the PG repository without touching SQLite", () =>
      harness.run(async () => {
        const id = await assetService.add.service(
          { tenantId: a.tenantId, name: "Service-created", category: "disk" },
          actor(11)
        );
        expect(
          (
            await assetService.get.service(
              { tenantId: a.tenantId, id },
              actor(11)
            )
          ).name
        ).toBe("Service-created");
      }));
    it("updates role permission counts transactionally and rejects inactive roles", async () => {
      await harness.query(
        sql`INSERT INTO system_role(id,name,is_enabled,permission_count,data_scope,creator_id,create_time_utc,is_deleted)
      VALUES (20,'synthetic-business-role',TRUE,0,'all',1,1,FALSE),(22,'synthetic-second-role',TRUE,0,'all',1,1,FALSE)`,
        true
      );
      await harness.query(
        sql`INSERT INTO system_permission(id,code,name,category,is_enabled,creator_id,create_time_utc)
      VALUES (50,'synthetic:first','First','test',TRUE,1,1),(51,'synthetic:second','Second','test',TRUE,1,1)`,
        true
      );
      await harness.run(async () => {
        expect(
          await rolePermissions.onBatchInsert([
            { roleId: 20, permissionId: 50, creatorId: 1 },
            { roleId: 20, permissionId: 51, creatorId: 1 },
          ])
        ).toBe(2);
        expect(await rolePermissions.getCurrentPermissionCount(20)).toBe(2);
        expect(
          (await rolePermissions.getPermissionsByRoleIds([20]))
            .map((value) => value.code)
            .sort()
        ).toEqual(["synthetic:first", "synthetic:second"]);
        const associations = await rolePermissions.findAll({ roleId: 20 });
        expect(
          (
            await rolePermissions.findPage({
              roleId: 20,
              pageNo: 1,
              pageSize: 1,
            })
          ).total
        ).toBe(2);
        const moving = associations.find((value) => value.permissionId === 51);
        if (!moving)
          throw new Error("Missing synthetic permission association");
        expect(await rolePermissions.verifyRecordExists(moving.id)).toBe(true);
        await rolePermissions.onUpdate(moving.id, { roleId: 22 });
        expect((await rolePermissions.findById(moving.id))?.roleId).toBe(22);
        expect(await rolePermissions.getCurrentPermissionCount(22)).toBe(1);
        await rolePermissions.onDelete(moving.id);
        expect(await rolePermissions.verifyRecordExists(moving.id)).toBe(false);
        expect(await rolePermissions.getCurrentPermissionCount(22)).toBe(0);
        await rolePermissions.onInsert({
          roleId: 20,
          permissionId: 51,
          creatorId: 1,
        });
        expect((await rolePermissions.getPermissionsByRole(20)).length).toBe(2);
        expect(await rolePermissions.onBatchDelete(20, [50])).toBe(1);
        expect(
          (
            await harness.query(
              sql`SELECT permission_count FROM system_role WHERE id = 20`
            )
          )[0].permission_count
        ).toBe("1");
        await harness.query(
          sql`UPDATE system_role SET is_enabled = FALSE WHERE id = 20`,
          true
        );
        expect(await rolePermissions.getPermissionsByRoleIds([20])).toEqual([]);
        await harness.query(
          sql`UPDATE system_role SET is_deleted = TRUE, deleted_time_utc = 1, deleter_id = 1 WHERE id = 20`,
          true
        );
        await expect(
          rolePermissions.onInsert({
            roleId: 20,
            permissionId: 50,
            creatorId: 1,
          })
        ).rejects.toMatchObject({ message: RoleDeletionError.NOT_ACTIVE });
      });
    });
    it("transfers ownership atomically and retains optimistic member versions", () =>
      harness.run(async () => {
        await member(12, "admin");
        const original = await currentMember(11);
        const target = await currentMember(12);
        await tenantRepository.transferOwner(
          {
            tenantId: a.tenantId,
            toUserId: 12,
            expectedSourceTimeUtc: original.updateTimeUtc,
            expectedTargetTimeUtc: target.updateTimeUtc,
          },
          { ...a, capability: "manage" }
        );
        expect((await currentMember(11)).role).toBe("admin");
        expect((await currentMember(12)).role).toBe("owner");
        await expect(
          tenantRepository.transferOwner(
            {
              tenantId: a.tenantId,
              toUserId: 12,
              expectedSourceTimeUtc: original.updateTimeUtc,
              expectedTargetTimeUtc: target.updateTimeUtc,
            },
            { ...a, capability: "manage" }
          )
        ).rejects.toMatchObject({ message: TenantError.STATE_CONFLICT });
        const list = await tenantRepository.members(
          { tenantId: a.tenantId, pageNo: 2, pageSize: 1 },
          { ...a, capability: "manage" }
        );
        expect(list.total).toBe(2);
        expect(list.list[0].userId).toBe(12);
        expect(list.list[0].username).toBe("synthetic-pg-user-12");
      }));
    it("rolls back recovery metadata when its owner insert is rejected late", async () => {
      await harness.query(
        sql.raw(
          `CREATE FUNCTION reject_test_recovery() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.user_id = 12 THEN RETURN NULL; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_test_recovery_owner BEFORE INSERT ON enterprise_tenant_member FOR EACH ROW EXECUTE FUNCTION reject_test_recovery()`
        ),
        true
      );
      try {
        await harness.run(async () => {
          const previous = await company();
          await expect(
            tenantRepository.recoverOwner(
              {
                tenantId: a.tenantId,
                userId: 12,
                reason: "Must rollback",
                expectedUpdateTimeUtc: previous.updateTimeUtc,
              },
              principal(1)
            )
          ).rejects.toMatchObject({ message: TenantError.STATE_CONFLICT });
          expect((await company()).updateTimeUtc).toBe(previous.updateTimeUtc);
          expect((await company()).recoveryReason).toBeNull();
        });
      } finally {
        await harness.query(
          sql.raw("DROP FUNCTION reject_test_recovery() CASCADE"),
          true
        );
      }
    });
    it("updates identifier versions and prevents reopening closed assignment or binding history", () =>
      harness.run(async () => {
        const disk = await add();
        const identifierId = await assets.addIdentifier(
          a,
          {
            tenantId: a.tenantId,
            assetId: disk,
            expectedAssetUpdateTimeUtc: await version(disk),
            identifierType: "sn",
            namespace: "vendor",
            value: "SYNTHETIC-A",
            source: "inventory",
            confidence: "high",
            isVerified: true,
          },
          "synthetic-a"
        );
        const original = (
          await assets.identifiers(a, { tenantId: a.tenantId, assetId: disk })
        ).list[0];
        await assets.updateIdentifier(
          a,
          {
            tenantId: a.tenantId,
            assetId: disk,
            id: identifierId,
            expectedAssetUpdateTimeUtc: await version(disk),
            expectedUpdateTimeUtc: original.updateTimeUtc,
            identifierType: "sn",
            namespace: "vendor",
            value: "SYNTHETIC-B",
            source: "inventory",
            confidence: "high",
            isVerified: true,
          },
          "synthetic-b"
        );
        expect(
          (await assets.identifiers(a, { tenantId: a.tenantId, assetId: disk }))
            .list[0].normalizedValue
        ).toBe("synthetic-b");
        const assignmentId = await assets.assign(a, {
          tenantId: a.tenantId,
          assetId: disk,
          hostAssetId: null,
          location: "Test room",
          validFromUtc: start,
          reason: "Install",
          expectedAssetUpdateTimeUtc: await version(disk),
        });
        const assignment = (
          await assets.assignments(a, { tenantId: a.tenantId, assetId: disk })
        ).list[0];
        const beforeInvalidClose = await version(disk);
        await expect(
          assets.closeAssignment(a, {
            tenantId: a.tenantId,
            assetId: disk,
            id: assignmentId,
            expectedAssetUpdateTimeUtc: beforeInvalidClose,
            expectedUpdateTimeUtc: assignment.updateTimeUtc,
            validToUtc: Date.now() + 60000,
            reason: "Future is invalid",
          })
        ).rejects.toMatchObject({ message: AssetError.STATE_CONFLICT });
        expect(await version(disk)).toBe(beforeInvalidClose);
        await assets.closeAssignment(a, {
          tenantId: a.tenantId,
          assetId: disk,
          id: assignmentId,
          expectedAssetUpdateTimeUtc: await version(disk),
          expectedUpdateTimeUtc: assignment.updateTimeUtc,
          validToUtc: start + 1000,
          reason: "End installation",
        });
        const closed = (
          await assets.assignments(a, { tenantId: a.tenantId, assetId: disk })
        ).list[0];
        await expect(
          assets.closeAssignment(a, {
            tenantId: a.tenantId,
            assetId: disk,
            id: assignmentId,
            expectedAssetUpdateTimeUtc: await version(disk),
            expectedUpdateTimeUtc: closed.updateTimeUtc,
            validToUtc: start + 2000,
            reason: "Cannot edit closed history",
          })
        ).rejects.toMatchObject({ message: AssetError.STATE_CONFLICT });
        const bindingId = await bind(disk);
        const binding = (
          await assets.bindings(a, { tenantId: a.tenantId, assetId: disk })
        ).list[0];
        await assets.closeBinding(a, {
          tenantId: a.tenantId,
          assetId: disk,
          id: bindingId,
          expectedAssetUpdateTimeUtc: await version(disk),
          expectedUpdateTimeUtc: binding.updateTimeUtc,
          validToUtc: start + 1000,
          reason: "End measurement",
        });
        expect(
          (
            await assets.resolve(a, {
              tenantId: a.tenantId,
              ...source,
              observedTimeUtc: start + 1000,
            })
          ).status
        ).toBe("unmapped");
      }));
    it("keeps failed replacement insertion and previous relation changes in one rollback", async () => {
      const disk = await harness.run(() => add());
      const first = await harness.run(() => bind(disk));
      await harness.query(
        sql.raw(
          `CREATE FUNCTION reject_test_binding_close() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.valid_to_utc IS NULL AND NEW.valid_to_utc IS NOT NULL THEN RETURN NULL; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_test_binding_close_row BEFORE UPDATE ON enterprise_asset_measurement_binding FOR EACH ROW EXECUTE FUNCTION reject_test_binding_close()`
        ),
        true
      );
      try {
        await harness.run(async () => {
          const previousVersion = await version(disk);
          const original = (
            await assets.bindings(a, { tenantId: a.tenantId, assetId: disk })
          ).list[0];
          await expect(
            assets.bind(a, {
              tenantId: a.tenantId,
              assetId: disk,
              ...source,
              validFromUtc: start + 1000,
              replacesId: first,
              expectedAssetUpdateTimeUtc: previousVersion,
              expectedUpdateTimeUtc: original.updateTimeUtc,
              reason: "Must rollback",
            })
          ).rejects.toMatchObject({ message: AssetError.STATE_CONFLICT });
          expect(await version(disk)).toBe(previousVersion);
          const history = await assets.bindings(a, {
            tenantId: a.tenantId,
            assetId: disk,
          });
          expect(history.total).toBe(1);
          expect(history.list[0].validToUtc).toBeNull();
        });
      } finally {
        await harness.query(
          sql.raw("DROP FUNCTION reject_test_binding_close() CASCADE"),
          true
        );
      }
    });
    it("cannot bind another creator's token or reuse an existing binding in another enterprise", async () => {
      await addToken();
      await harness.run(async () => {
        await expect(
          tenantRepository.tokenGrantSet(
            {
              tenantId: b.tenantId,
              tokenId: 101,
              isEnabled: true,
              expectedUpdateTimeUtc: null,
            },
            { ...b, capability: "manage" },
            101
          )
        ).rejects.toMatchObject({ message: TenantError.STATE_CONFLICT });
        await tenantRepository.tokenGrantSet(
          {
            tenantId: a.tenantId,
            tokenId: 101,
            isEnabled: true,
            expectedUpdateTimeUtc: null,
          },
          { ...a, capability: "manage" },
          101
        );
        await member(11, "owner", b);
        await expect(
          tenantRepository.tokenGrantSet(
            {
              tenantId: b.tenantId,
              tokenId: 101,
              isEnabled: true,
              expectedUpdateTimeUtc: null,
            },
            { ...b, principal: principal(11), capability: "manage" },
            101
          )
        ).rejects.toMatchObject({ message: TenantError.STATE_CONFLICT });
        const original = (
          await tenantRepository.tokenGrants(
            { tenantId: a.tenantId },
            { ...a, capability: "manage" }
          )
        ).list[0];
        await tenantRepository.tokenGrantSet(
          {
            tenantId: a.tenantId,
            tokenId: 101,
            isEnabled: false,
            expectedUpdateTimeUtc: original.updateTimeUtc,
          },
          { ...a, capability: "manage" },
          null
        );
        await expect(
          tenantRepository.tokenGrantSet(
            {
              tenantId: a.tenantId,
              tokenId: 101,
              isEnabled: true,
              expectedUpdateTimeUtc: original.updateTimeUtc,
            },
            { ...a, capability: "manage" },
            101
          )
        ).rejects.toMatchObject({ message: TenantError.STATE_CONFLICT });
      });
    });
  }
);
