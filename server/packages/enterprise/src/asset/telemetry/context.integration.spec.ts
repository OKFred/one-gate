import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { sql, type SQL } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import type { UserObj } from "@hodor/core/types/app";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import tokenSql from "@hodor/core/db/sql/admin/system_api_token.sql?raw";
import tenantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant.sql?raw";
import memberSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_member.sql?raw";
import grantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_api_token_grant.sql?raw";
import { getMappingContext, tenantGuard } from "../../tenant/context";
import { TenantError } from "../../tenant/errors";
import {
  getTelemetryContext,
  telemetryGuard,
  TELEMETRY_READ_PERMISSION,
} from "./context";

vi.mock("@hodor/admin/common/registry", async () => {
  const { systemAccess } = await import("@hodor/admin/system/access-metadata");
  return { registry: { system: { access: systemAccess } } };
});

function human(userId: number): UserObj {
  return {
    principal: { kind: "user", userId },
    id: userId,
    userId,
    username: `synthetic-user-${userId}`,
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

async function allowed(condition: SQL): Promise<boolean> {
  const [row] = await db.all<{ allowed: number }>(
    sql`SELECT CASE WHEN ${condition} THEN 1 ELSE 0 END AS allowed`
  );
  return row?.allowed === 1;
}

describe("sensitive asset telemetry catalog authorization", () => {
  beforeAll(() =>
    setupTestDb(db, [
      userSql,
      roleSql,
      permissionSql,
      rolePermissionSql,
      tokenSql,
      tenantSql,
      memberSql,
      grantSql,
    ])
  );

  beforeEach(async () => {
    await clearTestData(db, [
      "enterprise_tenant_api_token_grant",
      "enterprise_tenant_member",
      "enterprise_tenant",
      "system_role_permission",
      "system_permission",
      "system_api_token",
      "system_user",
      "system_role",
    ]);
    await db.run(sql`INSERT INTO system_role
      (id,name,is_enabled,permission_count,data_scope,creator_id,is_deleted)
      VALUES (1,'synthetic-platform',1,0,'all',1,0),
        (2,'synthetic-telemetry-only',1,1,'all',1,0),
        (3,'synthetic-mapping-only',1,1,'all',1,0),
        (4,'synthetic-both',1,2,'all',1,0)`);
    await db.run(sql`INSERT INTO system_permission
      (id,code,name,category,is_enabled,creator_id)
      VALUES (1,${TELEMETRY_READ_PERMISSION},'telemetry','action',1,1),
        (2,'enterprise.asset.mapping:read','mapping','action',1,1)`);
    await db.run(sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id)
      VALUES (2,1,1),(3,2,1),(4,1,1),(4,2,1)`);
    for (const [id, roleId] of [
      [1, 1],
      [11, 2],
      [12, 3],
      [13, 4],
      [21, 4],
    ]) {
      await db.run(sql`INSERT INTO system_user
        (id,username,password,lang_code,role_id_arr,is_enabled,creator_id)
        VALUES (${id},${`synthetic-user-${id}`},'synthetic-hash','en-US',${JSON.stringify([roleId])},1,1)`);
    }
    await db.run(sql`INSERT INTO enterprise_tenant
      (id,key,name,is_enabled,creator_id,create_time_utc,update_time_utc)
      VALUES (1,'synthetic-a','Synthetic A',1,1,1,1),(2,'synthetic-b','Synthetic B',1,1,1,1)`);
    await db.run(sql`INSERT INTO enterprise_tenant_member
      (tenant_id,user_id,role,is_enabled,creator_id,create_time_utc,update_time_utc)
      VALUES (1,11,'owner',1,1,1,1),(1,12,'viewer',1,1,1,1),
        (1,13,'viewer',1,1,1,1),(2,21,'owner',1,1,1,1)`);
    for (const [id, permissions] of [
      [10, ["enterprise.asset.mapping:read"]],
      [11, [TELEMETRY_READ_PERMISSION]],
      [12, ["enterprise.asset.mapping:read", TELEMETRY_READ_PERMISSION]],
    ] as const) {
      await db.run(sql`INSERT INTO system_api_token
        (id,name,token_prefix,token_hash,permissions,status,creator_id)
        VALUES (${id},${`synthetic-token-${id}`},'fixture',${`synthetic-token-hash-${id}`},
          ${JSON.stringify(permissions)},'active',1)`);
      await db.run(sql`INSERT INTO enterprise_tenant_api_token_grant
        (tenant_id,token_id,is_enabled,creator_id,create_time_utc,update_time_utc)
        VALUES (1,${id},1,1,1,1)`);
    }
  });

  it("requires the dedicated permission for humans and does not trust loaded super-admin claims", async () => {
    expect(
      await allowed(telemetryGuard(getTelemetryContext(1, human(11))))
    ).toBe(true);
    expect(
      await allowed(telemetryGuard(getTelemetryContext(1, human(13))))
    ).toBe(true);
    expect(
      await allowed(telemetryGuard(getTelemetryContext(1, human(12))))
    ).toBe(false);
    expect(
      await allowed(telemetryGuard(getTelemetryContext(2, human(11))))
    ).toBe(false);
  });

  it("retains existing super-admin rules and still requires enterprise membership", async () => {
    const guard = telemetryGuard(getTelemetryContext(1, human(1)));
    expect(await allowed(guard)).toBe(false);
    await db.run(sql`INSERT INTO enterprise_tenant_member
      (tenant_id,user_id,role,is_enabled,creator_id,create_time_utc,update_time_utc)
      VALUES (1,1,'viewer',1,1,1,1)`);
    expect(await allowed(guard)).toBe(true);
    await db.run(sql`UPDATE system_role SET is_enabled=0 WHERE id=1`);
    expect(await allowed(guard)).toBe(false);
  });

  it("requires both token permissions and the tenant grant without inheriting creator privileges", async () => {
    expect(
      await allowed(telemetryGuard(getTelemetryContext(1, machine(10))))
    ).toBe(false);
    expect(
      await allowed(telemetryGuard(getTelemetryContext(1, machine(11))))
    ).toBe(false);
    expect(
      await allowed(telemetryGuard(getTelemetryContext(1, machine())))
    ).toBe(true);
    expect(
      await allowed(telemetryGuard(getTelemetryContext(2, machine())))
    ).toBe(false);
  });

  it("preserves the old mapping-only token interface", async () => {
    const context = await getMappingContext(1, machine(10));
    expect(await allowed(tenantGuard(context))).toBe(true);
    expect(
      await allowed(telemetryGuard(getTelemetryContext(1, machine(10))))
    ).toBe(false);
  });

  it.each([
    [
      "permission disabled",
      sql`UPDATE system_permission SET is_enabled=0 WHERE id=1`,
    ],
    [
      "role permission revoked",
      sql`DELETE FROM system_role_permission WHERE role_id=2 AND permission_id=1`,
    ],
    ["role disabled", sql`UPDATE system_role SET is_enabled=0 WHERE id=2`],
    [
      "role deleted",
      sql`UPDATE system_role SET is_deleted=1,deleted_time_utc=1,deleter_id=1 WHERE id=2`,
    ],
    ["user disabled", sql`UPDATE system_user SET is_enabled=0 WHERE id=11`],
    [
      "membership disabled",
      sql`UPDATE enterprise_tenant_member SET is_enabled=0 WHERE tenant_id=1 AND user_id=11`,
    ],
    [
      "tenant disabled",
      sql`UPDATE enterprise_tenant SET is_enabled=0 WHERE id=1`,
    ],
  ])("rechecks a built human scope when %s", async (_, revoke) => {
    const guard = telemetryGuard(getTelemetryContext(1, human(11)));
    expect(await allowed(guard)).toBe(true);
    await db.run(revoke);
    expect(await allowed(guard)).toBe(false);
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
      sql`UPDATE enterprise_tenant_api_token_grant SET is_enabled=0 WHERE token_id=12`,
    ],
    [
      "grant deleted",
      sql`DELETE FROM enterprise_tenant_api_token_grant WHERE token_id=12`,
    ],
    [
      "tenant disabled",
      sql`UPDATE enterprise_tenant SET is_enabled=0 WHERE id=1`,
    ],
    ["owner disabled", sql`UPDATE system_user SET is_enabled=0 WHERE id=11`],
    [
      "owner membership disabled",
      sql`UPDATE enterprise_tenant_member SET is_enabled=0 WHERE tenant_id=1 AND user_id=11`,
    ],
    [
      "no remaining owner",
      sql`UPDATE enterprise_tenant_member SET role='viewer' WHERE tenant_id=1 AND user_id=11`,
    ],
  ])("rechecks a built token scope when %s", async (_, revoke) => {
    const guard = telemetryGuard(getTelemetryContext(1, machine()));
    expect(await allowed(guard)).toBe(true);
    await db.run(revoke);
    expect(await allowed(guard)).toBe(false);
  });

  it("rejects a principal that does not match the authenticated user", () => {
    expect(() => getTelemetryContext(1, { ...human(11), userId: 12 })).toThrow(
      TenantError.NOT_VISIBLE
    );
  });
});
