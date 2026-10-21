import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import { Validator } from "@cfworker/json-schema";
import db from "@hodor/core/db/index";
import { setupTestDb, clearTestData } from "@hodor/core/db/testHelper";
import type { UserObj } from "@hodor/core/types/app";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import tokenSql from "@hodor/core/db/sql/admin/system_api_token.sql?raw";
import tenantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant.sql?raw";
import memberSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_member.sql?raw";
import grantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_api_token_grant.sql?raw";
import service from "./service";
import { tenantRepository } from "./repository";
import {
  tenantTable,
  tenantMemberTable,
  tenantApiTokenGrantTable,
} from "./model";
import { TenantError } from "./errors";
import { getTenantContext, getMappingContext } from "./context";

vi.mock("@hodor/admin/common/registry", async () => {
  const { systemAccess } = await import("@hodor/admin/system/access-metadata");
  return { registry: { system: { access: systemAccess } } };
});

function actor(userId: number, isSuperAdmin = userId === 1): UserObj {
  return {
    principal: { kind: "user", userId },
    id: userId,
    userId,
    username: `tenant-user-${userId}`,
    langCode: "en-US",
    isEnabled: true,
    token: "test-only",
    isSuperAdmin,
    roleIds: isSuperAdmin ? [1] : [],
    permissions: [],
    dataScope: "self_only",
    customDeptIds: [],
    ensureLoaded: async () => undefined,
  };
}
function machine(tokenId: number, creatorId = 11): UserObj {
  return {
    ...actor(creatorId, false),
    principal: { kind: "api_token", tokenId },
    username: "machine-token",
  };
}

let a = 0;
let b = 0;
async function member(tenantId: number, userId: number) {
  const [row] = await db
    .select()
    .from(tenantMemberTable)
    .where(
      sql`${tenantMemberTable.tenantId} = ${tenantId} AND ${tenantMemberTable.userId} = ${userId}`
    );
  if (!row) throw new Error("Missing test member");
  return row;
}
async function company(tenantId: number) {
  const [row] = await db
    .select()
    .from(tenantTable)
    .where(eq(tenantTable.id, tenantId));
  if (!row) throw new Error("Missing test enterprise");
  return row;
}
async function addMember(
  userId: number,
  role: "owner" | "admin" | "editor" | "viewer",
  tenantId = a,
  ownerId = 11
) {
  return service.memberSet.service(
    { tenantId, userId, role, isEnabled: true, expectedUpdateTimeUtc: null },
    actor(ownerId)
  );
}
async function addToken(
  id: number,
  creatorId = 11,
  permission = true,
  status = "active"
) {
  await db.run(sql`INSERT INTO system_api_token
    (id,name,token_prefix,token_hash,permissions,status,creator_id,create_time_utc)
    VALUES (${id}, ${`test-token-${id}`}, 'fixture', ${`synthetic-hash-${id}`},
      ${JSON.stringify(permission ? ["enterprise.asset.mapping:read"] : [])}, ${status}, ${creatorId}, 1)`);
}
async function grant(tokenId: number, tenantId = a, ownerId = 11) {
  return service.tokenGrantSet.service(
    { tenantId, tokenId, isEnabled: true, expectedUpdateTimeUtc: null },
    actor(ownerId)
  );
}

describe("enterprise tenant isolation, ownership and machine grants", () => {
  beforeAll(async () => {
    await setupTestDb(db, [
      userSql,
      roleSql,
      tokenSql,
      tenantSql,
      memberSql,
      grantSql,
    ]);
  });
  beforeEach(async () => {
    for (const trigger of [
      "test_tenant_ignore_owner",
      "test_tenant_ignore_demote",
      "test_tenant_ignore_recovery",
    ])
      await db.run(sql.raw(`DROP TRIGGER IF EXISTS ${trigger}`));
    await clearTestData(db, [
      "enterprise_tenant_api_token_grant",
      "enterprise_tenant_member",
      "enterprise_tenant",
      "system_api_token",
      "system_user",
      "system_role",
    ]);
    await db.run(sql`INSERT INTO system_role (id,name,is_enabled,permission_count,data_scope,creator_id,create_time_utc,is_deleted,deleted_time_utc,deleter_id)
      VALUES (1,'platform-admin',1,0,'all',1,1,0,NULL,NULL)`);
    for (const id of [1, 11, 12, 13, 14, 21, 31]) {
      await db.run(sql`INSERT INTO system_user (id,username,password,lang_code,role_id_arr,is_enabled,creator_id,create_time_utc)
        VALUES (${id}, ${`tenant-user-${id}`}, 'synthetic-password-hash', 'en-US', ${JSON.stringify(id === 1 ? [1] : [])}, 1, 1, 1)`);
    }
    a = await service.create.service(
      { key: "enterprise-a", name: "Enterprise A", ownerUserId: 11 },
      actor(1)
    );
    b = await service.create.service(
      { key: "enterprise-b", name: "Enterprise B", ownerUserId: 21 },
      actor(1)
    );
  });

  it("creates each enterprise with exactly one owner in the same transaction", async () => {
    expect((await member(a, 11)).role).toBe("owner");
    expect((await member(b, 21)).role).toBe("owner");
    const rows = await db.select().from(tenantMemberTable);
    expect(rows).toHaveLength(2);
    expect((await company(a)).isEnabled).toBe(true);
  });

  it("restricts normal lists to current membership and does not infer platform membership", async () => {
    const mine = await service.list.service({}, actor(11));
    expect(mine.list.map((row) => row.id)).toEqual([a]);
    expect(mine.list[0]?.memberRole).toBe("owner");
    expect(mine.canManagePlatform).toBe(false);
    const superList = await service.list.service({}, actor(1));
    expect(superList.list).toEqual([]);
    expect(superList.canManagePlatform).toBe(true);
    expect((await service.platformList.service({}, actor(1))).total).toBe(2);
  });

  it("does not permit a forged super flag when the current database role is not platform admin", async () => {
    await expect(
      service.platformList.service({}, actor(11, true))
    ).rejects.toThrow(TenantError.PLATFORM_REQUIRED);
    await expect(
      service.create.service(
        { key: "forged", name: "Forged", ownerUserId: 11 },
        actor(11, true)
      )
    ).rejects.toThrow(TenantError.PLATFORM_REQUIRED);
  });

  it("keeps enterprise keys unique even when an enterprise is disabled", async () => {
    const row = await company(a);
    await service.update.service(
      {
        tenantId: a,
        name: row.name,
        isEnabled: false,
        expectedUpdateTimeUtc: row.updateTimeUtc,
      },
      actor(1)
    );
    await expect(
      service.create.service(
        { key: "enterprise-a", name: "Duplicate", ownerUserId: 11 },
        actor(1)
      )
    ).rejects.toThrow();
    expect(await db.select().from(tenantTable)).toHaveLength(2);
  });

  it("returns the same not-visible code for an unknown enterprise and another enterprise", async () => {
    await expect(getTenantContext(b, actor(11), "read")).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
    await expect(getTenantContext(999999, actor(11), "read")).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
    await expect(
      service.memberList.service({ tenantId: b }, actor(11))
    ).rejects.toThrow(TenantError.NOT_VISIBLE);
  });

  it("enforces viewer/editor/admin capabilities from the current member row", async () => {
    await addMember(12, "admin");
    await addMember(13, "editor");
    await addMember(14, "viewer");
    await expect(getTenantContext(a, actor(14), "read")).resolves.toMatchObject(
      { tenantId: a, capability: "read" }
    );
    await expect(getTenantContext(a, actor(14), "edit")).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
    await expect(getTenantContext(a, actor(13), "edit")).resolves.toMatchObject(
      { capability: "edit" }
    );
    await expect(getTenantContext(a, actor(13), "manage")).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
    expect(
      (await service.memberList.service({ tenantId: a }, actor(12))).total
    ).toBe(4);
  });

  it("rejects API tokens for human management and normal enterprise lists", async () => {
    await expect(service.list.service({}, machine(1))).rejects.toThrow(
      TenantError.HUMAN_REQUIRED
    );
    await expect(
      service.memberList.service({ tenantId: a }, machine(1))
    ).rejects.toThrow(TenantError.HUMAN_REQUIRED);
    await expect(
      service.platformList.service({}, { ...machine(1), isSuperAdmin: true })
    ).rejects.toThrow(TenantError.HUMAN_REQUIRED);
  });

  it("does not let an admin promote itself or modify an owner", async () => {
    await addMember(12, "admin");
    const admin = await member(a, 12);
    const owner = await member(a, 11);
    await expect(
      service.memberSet.service(
        {
          tenantId: a,
          userId: 12,
          role: "owner",
          isEnabled: true,
          expectedUpdateTimeUtc: admin.updateTimeUtc,
        },
        actor(12)
      )
    ).rejects.toThrow(TenantError.STATE_CONFLICT);
    await expect(
      service.memberSet.service(
        {
          tenantId: a,
          userId: 11,
          role: "viewer",
          isEnabled: true,
          expectedUpdateTimeUtc: owner.updateTimeUtc,
        },
        actor(12)
      )
    ).rejects.toThrow(TenantError.STATE_CONFLICT);
    expect((await member(a, 11)).role).toBe("owner");
  });

  it("requires the actual row version and does not silently upsert a stale new-member request", async () => {
    await addMember(12, "viewer");
    const before = await member(a, 12);
    const tenant = await company(a);
    await expect(addMember(12, "editor")).rejects.toThrow(
      TenantError.STATE_CONFLICT
    );
    await expect(
      service.memberSet.service(
        {
          tenantId: a,
          userId: 12,
          role: "editor",
          isEnabled: true,
          expectedUpdateTimeUtc: before.updateTimeUtc - 1,
        },
        actor(11)
      )
    ).rejects.toThrow(TenantError.STATE_CONFLICT);
    expect(await member(a, 12)).toEqual(before);
    expect(await company(a)).toEqual(tenant);
  });

  it("cannot remove the last active owner", async () => {
    const owner = await member(a, 11);
    const tenant = await company(a);
    for (const change of [
      { role: "viewer" as const, isEnabled: true },
      { role: "owner" as const, isEnabled: false },
    ]) {
      await expect(
        service.memberSet.service(
          {
            tenantId: a,
            userId: 11,
            ...change,
            expectedUpdateTimeUtc: owner.updateTimeUtc,
          },
          actor(11)
        )
      ).rejects.toThrow(TenantError.STATE_CONFLICT);
    }
    expect(await member(a, 11)).toEqual(owner);
    expect(await company(a)).toEqual(tenant);
  });

  it("permits a legitimate self-exit when another effective owner remains", async () => {
    await addMember(12, "owner");
    const owner = await member(a, 11);
    await service.memberSet.service(
      {
        tenantId: a,
        userId: 11,
        role: "owner",
        isEnabled: false,
        expectedUpdateTimeUtc: owner.updateTimeUtc,
      },
      actor(11)
    );
    expect((await member(a, 11)).isEnabled).toBe(false);
    expect((await getTenantContext(a, actor(12), "manage")).tenantId).toBe(a);
  });

  it("allows only one of two concurrent last-owner removals", async () => {
    await addMember(12, "owner");
    const first = await member(a, 11);
    const second = await member(a, 12);
    const firstContext = await getTenantContext(a, actor(11), "manage");
    const secondContext = await getTenantContext(a, actor(12), "manage");
    const results = await Promise.allSettled([
      tenantRepository.memberSet(
        {
          tenantId: a,
          userId: 11,
          role: "owner",
          isEnabled: false,
          expectedUpdateTimeUtc: first.updateTimeUtc,
        },
        firstContext
      ),
      tenantRepository.memberSet(
        {
          tenantId: a,
          userId: 12,
          role: "owner",
          isEnabled: false,
          expectedUpdateTimeUtc: second.updateTimeUtc,
        },
        secondContext
      ),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    const owners = await db
      .select()
      .from(tenantMemberTable)
      .where(
        sql`${tenantMemberTable.tenantId} = ${a} AND ${tenantMemberTable.role} = 'owner' AND ${tenantMemberTable.isEnabled} = 1`
      );
    expect(owners).toHaveLength(1);
  });

  it("transfers ownership atomically with both expected member versions", async () => {
    await addMember(12, "viewer");
    const source = await member(a, 11);
    const target = await member(a, 12);
    await service.transferOwner.service(
      {
        tenantId: a,
        toUserId: 12,
        expectedSourceTimeUtc: source.updateTimeUtc,
        expectedTargetTimeUtc: target.updateTimeUtc,
      },
      actor(11)
    );
    expect((await member(a, 11)).role).toBe("admin");
    expect((await member(a, 12)).role).toBe("owner");
    expect((await member(a, 11)).updateTimeUtc).toBeGreaterThan(
      source.updateTimeUtc
    );
    expect((await member(a, 12)).updateTimeUtc).toBeGreaterThan(
      target.updateTimeUtc
    );
  });

  it("rolls back promotion when a later transfer demotion affects zero rows", async () => {
    await addMember(12, "viewer");
    const source = await member(a, 11);
    const target = await member(a, 12);
    const before = await company(a);
    await db.run(
      sql`CREATE TRIGGER test_tenant_ignore_demote BEFORE UPDATE ON enterprise_tenant_member WHEN OLD.user_id = 11 AND NEW.role = 'admin' BEGIN SELECT RAISE(IGNORE); END`
    );
    await expect(
      service.transferOwner.service(
        {
          tenantId: a,
          toUserId: 12,
          expectedSourceTimeUtc: source.updateTimeUtc,
          expectedTargetTimeUtc: target.updateTimeUtc,
        },
        actor(11)
      )
    ).rejects.toThrow(TenantError.STATE_CONFLICT);
    expect(await member(a, 11)).toEqual(source);
    expect(await member(a, 12)).toEqual(target);
    expect(await company(a)).toEqual(before);
  });

  it("rolls back a newly inserted enterprise when its owner insert is ignored", async () => {
    await db.run(
      sql`CREATE TRIGGER test_tenant_ignore_owner BEFORE INSERT ON enterprise_tenant_member WHEN NEW.user_id = 31 BEGIN SELECT RAISE(IGNORE); END`
    );
    await expect(
      service.create.service(
        { key: "failed-owner", name: "No partial enterprise", ownerUserId: 31 },
        actor(1)
      )
    ).rejects.toThrow(TenantError.STATE_CONFLICT);
    expect(
      await db
        .select()
        .from(tenantTable)
        .where(eq(tenantTable.key, "failed-owner"))
    ).toEqual([]);
  });

  it("freezes normal human and machine access when the last owner is globally disabled", async () => {
    await addToken(1);
    await grant(1);
    await db.run(sql`UPDATE system_user SET is_enabled = 0 WHERE id = 11`);
    await expect(getTenantContext(a, actor(11), "read")).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
    await expect(getMappingContext(a, machine(1))).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
    expect(
      (await service.platformList.service({}, actor(1))).list.find(
        (row) => row.id === a
      )?.frozen
    ).toBe(true);
  });

  it("supports audited platform recovery without granting an implicit normal asset bypass", async () => {
    await db.run(sql`UPDATE system_user SET is_enabled = 0 WHERE id = 11`);
    const before = await company(a);
    const audit = vi.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      await service.recoverOwner.service(
        {
          tenantId: a,
          userId: 12,
          expectedUpdateTimeUtc: before.updateTimeUtc,
          reason: "Synthetic recovery drill",
        },
        actor(1)
      );
      expect((await member(a, 12)).role).toBe("owner");
      expect((await company(a)).recoveryReason).toBe(
        "Synthetic recovery drill"
      );
      expect(audit).toHaveBeenCalledOnce();
      await expect(getTenantContext(a, actor(1), "read")).rejects.toThrow(
        TenantError.NOT_VISIBLE
      );
      await expect(
        getTenantContext(a, actor(12), "manage")
      ).resolves.toMatchObject({ tenantId: a });
    } finally {
      audit.mockRestore();
    }
  });

  it("rolls back recovery metadata if the member upsert is ignored", async () => {
    const before = await company(a);
    await db.run(
      sql`CREATE TRIGGER test_tenant_ignore_recovery BEFORE INSERT ON enterprise_tenant_member WHEN NEW.user_id = 31 BEGIN SELECT RAISE(IGNORE); END`
    );
    await expect(
      service.recoverOwner.service(
        {
          tenantId: a,
          userId: 31,
          expectedUpdateTimeUtc: before.updateTimeUtc,
          reason: "Rollback",
        },
        actor(1)
      )
    ).rejects.toThrow(TenantError.STATE_CONFLICT);
    expect(await company(a)).toEqual(before);
  });

  it("rechecks membership and enterprise activation in the final write SQL", async () => {
    await addMember(12, "admin");
    const context = await getTenantContext(a, actor(12), "manage");
    await db.run(
      sql`UPDATE enterprise_tenant_member SET is_enabled = 0 WHERE tenant_id = ${a} AND user_id = 12`
    );
    await expect(
      tenantRepository.memberSet(
        {
          tenantId: a,
          userId: 13,
          role: "viewer",
          isEnabled: true,
          expectedUpdateTimeUtc: null,
        },
        context
      )
    ).rejects.toThrow(TenantError.STATE_CONFLICT);
    const ownerContext = await getTenantContext(a, actor(11), "manage");
    await db.run(
      sql`UPDATE enterprise_tenant SET is_enabled = 0 WHERE id = ${a}`
    );
    await expect(
      tenantRepository.memberSet(
        {
          tenantId: a,
          userId: 13,
          role: "viewer",
          isEnabled: true,
          expectedUpdateTimeUtc: null,
        },
        ownerContext
      )
    ).rejects.toThrow(TenantError.STATE_CONFLICT);
    expect(
      await db
        .select()
        .from(tenantMemberTable)
        .where(
          sql`${tenantMemberTable.tenantId} = ${a} AND ${tenantMemberTable.userId} = 13`
        )
    ).toEqual([]);
  });

  it("does not let an old unbound token inherit its creator's enterprises", async () => {
    await addToken(1);
    await addMember(11, "viewer", b, 21);
    await expect(getMappingContext(a, machine(1))).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
    await expect(getMappingContext(b, machine(1))).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
    await grant(1);
    await expect(getMappingContext(a, machine(1))).resolves.toMatchObject({
      tenantId: a,
      principal: { kind: "api_token", tokenId: 1 },
    });
    await expect(getMappingContext(b, machine(1))).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
  });

  it("requires a token owned by the grant manager and blocks binding it to a second enterprise", async () => {
    await addToken(1, 12);
    await expect(grant(1)).rejects.toThrow(TenantError.TOKEN_UNAVAILABLE);
    await addToken(2, 11);
    await grant(2);
    await addMember(11, "admin", b, 21);
    await expect(grant(2, b, 11)).rejects.toThrow(TenantError.STATE_CONFLICT);
    expect(await db.select().from(tenantApiTokenGrantTable)).toHaveLength(1);
  });

  it("requires mapping-read permission and current token validity", async () => {
    await addToken(1, 11, false);
    await expect(grant(1)).rejects.toThrow();
    await addToken(2);
    await grant(2);
    await db.run(
      sql`UPDATE system_api_token SET expire_time_utc = 1 WHERE id = 2`
    );
    await expect(getMappingContext(a, machine(2))).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
    await db.run(
      sql`UPDATE system_api_token SET expire_time_utc = NULL, status = 'revoked' WHERE id = 2`
    );
    await expect(getMappingContext(a, machine(2))).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
  });

  it("allows a current tenant manager to revoke another manager's grant", async () => {
    await addToken(1);
    await grant(1);
    await addMember(12, "admin");
    const [record] = await db
      .select()
      .from(tenantApiTokenGrantTable)
      .where(eq(tenantApiTokenGrantTable.tokenId, 1));
    await service.tokenGrantSet.service(
      {
        tenantId: a,
        tokenId: 1,
        isEnabled: false,
        expectedUpdateTimeUtc: record.updateTimeUtc,
      },
      actor(12)
    );
    await expect(getMappingContext(a, machine(1))).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
  });

  it("keeps machine runtime authorization independent from creator membership", async () => {
    await addMember(12, "owner");
    await addToken(1);
    await grant(1);
    await db.run(
      sql`UPDATE enterprise_tenant_member SET is_enabled = 0 WHERE tenant_id = ${a} AND user_id = 11`
    );
    await expect(getMappingContext(a, machine(1))).resolves.toMatchObject({
      tenantId: a,
    });
    await expect(getTenantContext(a, actor(11), "read")).rejects.toThrow(
      TenantError.NOT_VISIBLE
    );
  });

  it("does not expose token secrets or another enterprise's membership/grants", async () => {
    await addToken(1);
    await grant(1);
    const result = await service.tokenGrantList.service(
      { tenantId: a },
      actor(11)
    );
    expect(result.list).toHaveLength(1);
    expect(JSON.stringify(result)).not.toMatch(
      /synthetic-hash|token_hash|token_prefix|permissions/
    );
    await expect(
      service.tokenGrantList.service({ tenantId: a }, actor(21))
    ).rejects.toThrow(TenantError.NOT_VISIBLE);
    await expect(
      service.memberList.service({ tenantId: a }, actor(21))
    ).rejects.toThrow(TenantError.NOT_VISIBLE);
  });

  it("rejects immutable/system field injection and requires nullable expected versions explicitly", () => {
    const create = new Validator(service.create.req);
    expect(
      create.validate({
        key: "test",
        name: "Test",
        ownerUserId: 11,
        creatorId: 1,
      }).valid
    ).toBe(false);
    expect(
      create.validate({
        key: "test",
        name: "Test",
        ownerUserId: 11,
        isEnabled: true,
      }).valid
    ).toBe(false);
    const set = new Validator(service.memberSet.req);
    expect(
      set.validate({ tenantId: a, userId: 12, role: "viewer", isEnabled: true })
        .valid
    ).toBe(false);
    expect(
      set.validate({
        tenantId: a,
        userId: 12,
        role: "viewer",
        isEnabled: true,
        expectedUpdateTimeUtc: null,
      }).valid
    ).toBe(true);
    expect(
      new Validator(service.update.req).validate({
        tenantId: a,
        key: "changed",
        name: "Changed",
        isEnabled: true,
        expectedUpdateTimeUtc: 1,
      }).valid
    ).toBe(false);
  });
});
