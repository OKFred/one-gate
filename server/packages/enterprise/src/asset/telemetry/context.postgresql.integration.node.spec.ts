import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql, type SQL } from "drizzle-orm";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../../../../../apps/server/test/postgresql";
import type { UserObj } from "@hodor/core/types/app";
import { getMappingContext, tenantGuard } from "../../tenant/context";
import {
  getTelemetryContext,
  telemetryGuard,
  TELEMETRY_READ_PERMISSION,
} from "./context";

vi.mock("@hodor/admin/common/registry", async () => {
  const { systemAccess } = await import("@hodor/admin/system/access-metadata");
  return { registry: { system: { access: systemAccess } } };
});

function human(userId = 11): UserObj {
  return {
    principal: { kind: "user", userId },
    id: userId,
    userId,
    username: `synthetic-pg-user-${userId}`,
    langCode: "en-US",
    isEnabled: true,
    token: "synthetic-not-a-credential",
    isSuperAdmin: true,
    roleIds: [1],
    permissions: [],
    dataScope: "all",
    customDeptIds: [],
    ensureLoaded: async () => undefined,
  };
}

function machine(tokenId = 12): UserObj {
  return { ...human(1), principal: { kind: "api_token", tokenId } };
}

describe.skipIf(!postgresTestsConfigured)(
  "real PostgreSQL sensitive asset catalog authorization",
  () => {
    let harness: PostgresTestHarness;
    beforeAll(async () => {
      harness = await createPostgresTestHarness("telemetry_auth");
    });
    afterAll(async () => {
      await harness?.close();
    });
    beforeEach(async () => {
      await harness.reset();
      await harness.seedEnterpriseIdentities();
      await harness.query(
        sql`INSERT INTO system_permission
        (id,code,name,category,is_enabled,creator_id,create_time_utc)
        VALUES (1000,${TELEMETRY_READ_PERMISSION},'telemetry','action',TRUE,1,1)`,
        true
      );
      await harness.query(
        sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc)
        VALUES (2,1000,1,1)`,
        true
      );
      await harness.query(
        sql`INSERT INTO system_role
        (id,name,is_enabled,permission_count,data_scope,creator_id,create_time_utc,is_deleted)
        VALUES (3,'synthetic-mapping-only',TRUE,1,'all',1,1,FALSE)`,
        true
      );
      await harness.query(
        sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc)
        SELECT 3,id,1,1 FROM system_permission WHERE code='enterprise.asset.mapping:read'`,
        true
      );
      await harness.query(
        sql`UPDATE "system_user" SET role_id_arr='[3]'::jsonb WHERE id=12`,
        true
      );
      await harness.query(
        sql`INSERT INTO enterprise_tenant
        (id,key,name,is_enabled,creator_id,create_time_utc,update_time_utc)
        VALUES (1,'synthetic-a','Synthetic A',TRUE,1,1,1),
          (2,'synthetic-b','Synthetic B',TRUE,1,1,1)`,
        true
      );
      await harness.query(
        sql`INSERT INTO enterprise_tenant_member
        (tenant_id,user_id,role,is_enabled,creator_id,create_time_utc,update_time_utc)
        VALUES (1,11,'owner',TRUE,1,1,1),(1,12,'viewer',TRUE,1,1,1),
          (1,13,'viewer',TRUE,1,1,1),(2,21,'owner',TRUE,1,1,1)`,
        true
      );
      for (const [id, permissions] of [
        [10, ["enterprise.asset.mapping:read"]],
        [11, [TELEMETRY_READ_PERMISSION]],
        [12, ["enterprise.asset.mapping:read", TELEMETRY_READ_PERMISSION]],
      ] as const) {
        await harness.query(
          sql`INSERT INTO system_api_token
          (id,name,token_prefix,token_hash,permissions,status,creator_id,create_time_utc)
          VALUES (${id},${`synthetic-token-${id}`},'fixture',${`synthetic-token-hash-${id}`},
            ${JSON.stringify(permissions)},'active',1,1)`,
          true
        );
        await harness.query(
          sql`INSERT INTO enterprise_tenant_api_token_grant
          (tenant_id,token_id,is_enabled,creator_id,create_time_utc,update_time_utc)
          VALUES (1,${id},TRUE,1,1,1)`,
          true
        );
      }
    });

    function guard(user = human(), tenantId = 1): Promise<SQL> {
      return harness.run(async () =>
        telemetryGuard(getTelemetryContext(tenantId, user))
      );
    }

    async function allowed(condition: SQL): Promise<boolean> {
      const [row] = await harness.query<{ allowed: boolean }>(
        sql`SELECT ${condition} AS allowed`
      );
      return row?.allowed === true;
    }

    it("requires dedicated human permission and membership with existing super-admin rules", async () => {
      expect(await allowed(await guard())).toBe(true);
      expect(await allowed(await guard(human(13)))).toBe(true);
      expect(await allowed(await guard(human(12)))).toBe(false);
      expect(await allowed(await guard(human(), 2))).toBe(false);
      expect(await allowed(await guard(human(1)))).toBe(false);
      await harness.query(
        sql`INSERT INTO enterprise_tenant_member
        (tenant_id,user_id,role,is_enabled,creator_id,create_time_utc,update_time_utc)
        VALUES (1,1,'viewer',TRUE,1,1,1)`,
        true
      );
      expect(await allowed(await guard(human(1)))).toBe(true);
    });

    it("requires both token permissions and tenant grant without inheriting creator privileges", async () => {
      expect(await allowed(await guard(machine(10)))).toBe(false);
      expect(await allowed(await guard(machine(11)))).toBe(false);
      expect(await allowed(await guard(machine()))).toBe(true);
      expect(await allowed(await guard(machine(), 2))).toBe(false);
      const oldMapping = await harness.run(async () =>
        tenantGuard(await getMappingContext(1, machine(10)))
      );
      expect(await allowed(oldMapping)).toBe(true);
    });

    it.each([
      [
        "permission revoked",
        sql`DELETE FROM system_role_permission WHERE role_id=2 AND permission_id=1000`,
      ],
      [
        "permission disabled",
        sql`UPDATE system_permission SET is_enabled=FALSE WHERE id=1000`,
      ],
      [
        "role disabled",
        sql`UPDATE system_role SET is_enabled=FALSE WHERE id=2`,
      ],
      [
        "role deleted",
        sql`UPDATE system_role SET is_deleted=TRUE,deleted_time_utc=1,deleter_id=1 WHERE id=2`,
      ],
      [
        "membership disabled",
        sql`UPDATE enterprise_tenant_member SET is_enabled=FALSE WHERE tenant_id=1 AND user_id=11`,
      ],
      [
        "user disabled",
        sql`UPDATE "system_user" SET is_enabled=FALSE WHERE id=11`,
      ],
    ])("rechecks built human SQL when %s", async (_, revoke) => {
      const condition = await guard();
      expect(await allowed(condition)).toBe(true);
      await harness.query(revoke, true);
      expect(await allowed(condition)).toBe(false);
    });

    it.each([
      [
        "telemetry permission revoked",
        sql`UPDATE system_api_token SET permissions='["enterprise.asset.mapping:read"]' WHERE id=12`,
      ],
      [
        "mapping permission revoked",
        sql`UPDATE system_api_token SET permissions='["enterprise.asset.telemetry:read"]' WHERE id=12`,
      ],
      [
        "token revoked",
        sql`UPDATE system_api_token SET status='revoked' WHERE id=12`,
      ],
      [
        "token expired",
        sql`UPDATE system_api_token SET expire_time_utc=1 WHERE id=12`,
      ],
      [
        "token not yet active",
        sql`UPDATE system_api_token SET start_time_utc=9007199254740000 WHERE id=12`,
      ],
      [
        "grant disabled",
        sql`UPDATE enterprise_tenant_api_token_grant SET is_enabled=FALSE WHERE token_id=12`,
      ],
      [
        "grant deleted",
        sql`DELETE FROM enterprise_tenant_api_token_grant WHERE token_id=12`,
      ],
      [
        "tenant disabled",
        sql`UPDATE enterprise_tenant SET is_enabled=FALSE WHERE id=1`,
      ],
      [
        "owner disabled",
        sql`UPDATE "system_user" SET is_enabled=FALSE WHERE id=11`,
      ],
      [
        "owner membership disabled",
        sql`UPDATE enterprise_tenant_member SET is_enabled=FALSE WHERE tenant_id=1 AND user_id=11`,
      ],
      [
        "no remaining owner",
        sql`UPDATE enterprise_tenant_member SET role='viewer' WHERE tenant_id=1 AND user_id=11`,
      ],
    ])("rechecks built token SQL when %s", async (_, revoke) => {
      const condition = await guard(machine());
      expect(await allowed(condition)).toBe(true);
      await harness.query(revoke, true);
      expect(await allowed(condition)).toBe(false);
    });
  }
);
