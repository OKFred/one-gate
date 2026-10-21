import { beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { sql, eq } from "drizzle-orm";
import { Validator } from "@cfworker/json-schema";
import db from "@hodor/core/db/index";
import { setupTestDb } from "@hodor/core/db/testHelper";
import { initAdminRegistry } from "@hodor/admin/register";
import type { UserObj } from "@hodor/core/types/app";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import tokenSql from "@hodor/core/db/sql/admin/system_api_token.sql?raw";
import tenantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant.sql?raw";
import memberSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_member.sql?raw";
import grantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_api_token_grant.sql?raw";
import assetSql from "@hodor/core/db/sql/enterprise/enterprise_asset.sql?raw";
import identifierSql from "@hodor/core/db/sql/enterprise/enterprise_asset_identifier.sql?raw";
import assignmentSql from "@hodor/core/db/sql/enterprise/enterprise_asset_assignment.sql?raw";
import bindingSql from "@hodor/core/db/sql/enterprise/enterprise_asset_measurement_binding.sql?raw";
import {
  tenantTable,
  tenantMemberTable,
  tenantApiTokenGrantTable,
} from "../tenant/model";
import {
  getTenantContext,
  getMappingContext,
  type TenantContext,
} from "../tenant/context";
import {
  assetTable,
  assetIdentifierTable,
  assetAssignmentTable,
  assetMeasurementBindingTable,
  AssetAddReq,
  AssetUpdateReq,
  IdentifierAddReq,
  type IdentifierAddInput,
} from "./model";
import { assetRepository as repository } from "./repository";
import service, { mappingService, normalizeIdentifier } from "./service";
import { AssetError, guardedAssetWrite } from "./errors";

const a: TenantContext = {
  tenantId: 1,
  principal: { kind: "user", userId: 101 },
  capability: "edit",
};
const b: TenantContext = {
  tenantId: 2,
  principal: { kind: "user", userId: 102 },
  capability: "edit",
};
let start: number;

function actor(id = 101): UserObj {
  return {
    id,
    userId: id,
    principal: { kind: "user", userId: id },
    username: `fixture-${id}`,
    langCode: "en-US",
    token: "fixture-only",
    isEnabled: true,
    isSuperAdmin: false,
    roleIds: [],
    permissions: [],
    dataScope: "self_only",
    customDeptIds: [],
    ensureLoaded: async () => undefined,
  };
}
function machine(id = 10): UserObj {
  return { ...actor(103), principal: { kind: "api_token", tokenId: id } };
}
async function add(
  ctx = a,
  name = "Synthetic asset",
  category: "disk" | "host" | "sensor" = "disk",
  assetCode?: string
) {
  return repository.add(ctx, {
    tenantId: ctx.tenantId,
    name,
    category,
    assetCode,
  });
}
async function version(ctx: TenantContext, id: number) {
  const item = await repository.findById(ctx, id);
  if (!item) throw new Error("Missing synthetic asset");
  return item.updateTimeUtc;
}
function identifier(
  assetId: number,
  expectedAssetUpdateTimeUtc: number | null,
  value = "EXAMPLE-SN-001",
  tenantId = 1
): IdentifierAddInput {
  return {
    tenantId,
    assetId,
    expectedAssetUpdateTimeUtc,
    identifierType: "sn",
    namespace: "fixture-vendor",
    value,
    source: "synthetic inventory",
    confidence: "high",
    isVerified: true,
  };
}
async function assign(
  assetId: number,
  hostAssetId: number | null = null,
  from = start,
  ctx = a
) {
  return repository.assign(ctx, {
    tenantId: ctx.tenantId,
    assetId,
    expectedAssetUpdateTimeUtc: await version(ctx, assetId),
    hostAssetId,
    location: "Synthetic room",
    validFromUtc: from,
    reason: "Synthetic installation",
  });
}
const source = {
  sourceSystem: "fixture-telemetry",
  collectorId: "collector-a",
  deviceId: "device-a",
  metric: "temperature_c",
  channel: "disk",
};
async function bind(assetId: number, ctx = a, from = start, key = source) {
  return repository.bind(ctx, {
    tenantId: ctx.tenantId,
    assetId,
    expectedAssetUpdateTimeUtc: await version(ctx, assetId),
    ...key,
    validFromUtc: from,
    reason: "Synthetic mapping",
  });
}
async function resolve(ctx: TenantContext, at: number, key = source) {
  return repository.resolve(ctx, {
    tenantId: ctx.tenantId,
    ...key,
    observedTimeUtc: at,
  });
}

beforeAll(async () => {
  initAdminRegistry();
  await setupTestDb(db, [
    userSql,
    tokenSql,
    tenantSql,
    memberSql,
    grantSql,
    assetSql,
    identifierSql,
    assignmentSql,
    bindingSql,
  ]);
});
beforeEach(async () => {
  start = Date.now() - 60_000;
  await db.run(sql`DROP TRIGGER IF EXISTS synthetic_asset_late_failure`);
  for (const table of [
    "enterprise_asset_measurement_binding",
    "enterprise_asset_assignment",
    "enterprise_asset_identifier",
    "enterprise_asset",
    "enterprise_tenant_api_token_grant",
    "enterprise_tenant_member",
    "enterprise_tenant",
    "system_api_token",
    "system_user",
  ]) {
    await db.run(sql`DELETE FROM ${sql.identifier(table)}`);
  }
  for (const id of [101, 102, 103, 104, 105]) {
    await db.run(sql`INSERT INTO system_user (id,username,password,lang_code,role_id_arr,is_enabled,creator_id)
      VALUES (${id},${`fixture-${id}`},'synthetic-not-a-password','en-US','[]',1,${id})`);
  }
  await db.insert(tenantTable).values([
    {
      id: 1,
      key: "fixture-a",
      name: "Enterprise A",
      isEnabled: true,
      recoveryReason: null,
      creatorId: 101,
      updaterId: null,
      createTimeUtc: start,
      updateTimeUtc: start,
    },
    {
      id: 2,
      key: "fixture-b",
      name: "Enterprise B",
      isEnabled: true,
      recoveryReason: null,
      creatorId: 102,
      updaterId: null,
      createTimeUtc: start,
      updateTimeUtc: start,
    },
  ]);
  await db.insert(tenantMemberTable).values([
    {
      tenantId: 1,
      userId: 101,
      role: "owner",
      isEnabled: true,
      creatorId: 101,
      updaterId: null,
      createTimeUtc: start,
      updateTimeUtc: start,
    },
    {
      tenantId: 2,
      userId: 102,
      role: "owner",
      isEnabled: true,
      creatorId: 102,
      updaterId: null,
      createTimeUtc: start,
      updateTimeUtc: start,
    },
    {
      tenantId: 1,
      userId: 103,
      role: "editor",
      isEnabled: true,
      creatorId: 101,
      updaterId: null,
      createTimeUtc: start,
      updateTimeUtc: start,
    },
    {
      tenantId: 2,
      userId: 103,
      role: "viewer",
      isEnabled: true,
      creatorId: 102,
      updaterId: null,
      createTimeUtc: start,
      updateTimeUtc: start,
    },
    {
      tenantId: 1,
      userId: 104,
      role: "viewer",
      isEnabled: true,
      creatorId: 101,
      updaterId: null,
      createTimeUtc: start,
      updateTimeUtc: start,
    },
  ]);
  await db.run(sql`INSERT INTO system_api_token (id,name,token_prefix,token_hash,permissions,status,creator_id)
    VALUES (10,'Synthetic token','fixture','synthetic-asset-token-hash','["enterprise.asset.mapping:read"]','active',103)`);
});
afterEach(async () => {
  await db.run(sql`DROP TRIGGER IF EXISTS synthetic_asset_late_failure`);
});

describe("enterprise asset isolation and lifecycle", () => {
  it("creates stable independent identities without SN and permits duplicate names/codes in separate enterprises", async () => {
    const first = await add(a, "Same name", "disk", "CODE-001");
    const second = await add(b, "Same name", "disk", "CODE-001");
    const firstRow = await repository.findById(a, first);
    const secondRow = await repository.findById(b, second);
    expect(firstRow?.assetId).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondRow?.assetId).not.toBe(firstRow?.assetId);
    expect(
      (await repository.identifiers(a, { tenantId: 1, assetId: first })).total
    ).toBe(0);
    expect((await repository.findPage(a, { tenantId: 1 })).total).toBe(1);
    expect((await repository.findPage(b, { tenantId: 2 })).total).toBe(1);
  });

  it("does not expose another enterprise through get, totals, search, identifiers or histories", async () => {
    const target = await add(b, "B private asset");
    await repository.addIdentifier(
      b,
      identifier(target, null, "B-SYNTHETIC", 2),
      "B-SYNTHETIC"
    );
    await assign(target, null, start, b);
    await bind(target, b);
    expect(await repository.findById(a, target)).toBeNull();
    expect(
      (await repository.findPage(a, { tenantId: 1, keyword: "B private" }))
        .total
    ).toBe(0);
    expect(
      (await repository.identifiers(a, { tenantId: 1, assetId: target })).total
    ).toBe(0);
    expect(
      (await repository.assignments(a, { tenantId: 1, assetId: target })).total
    ).toBe(0);
    expect(
      (await repository.bindings(a, { tenantId: 1, assetId: target })).total
    ).toBe(0);
    expect((await repository.mappingPage(a, { tenantId: 1 })).total).toBe(0);
    await expect(getTenantContext(2, actor(101), "read")).rejects.toBeDefined();
    await expect(
      service.get.service({ tenantId: 1, id: target }, actor())
    ).rejects.toMatchObject({ code: AssetError.NOT_VISIBLE });
  });

  it("rejects cross-enterprise mutation even when the record id and expected version are known", async () => {
    const target = await add(b);
    await expect(
      repository.update(a, {
        tenantId: 1,
        id: target,
        expectedUpdateTimeUtc: null,
        name: "Unauthorized",
        category: "disk",
      })
    ).rejects.toMatchObject({ code: AssetError.STATE_CONFLICT });
    await expect(
      repository.retire(a, {
        tenantId: 1,
        id: target,
        expectedUpdateTimeUtc: null,
        reason: "Unauthorized",
      })
    ).rejects.toBeDefined();
    expect((await repository.findById(b, target))?.name).toBe(
      "Synthetic asset"
    );
    expect((await repository.findById(b, target))?.updateTimeUtc).toBeNull();
  });

  it("rejects same-enterprise code collisions without changing existing data", async () => {
    await add(a, "First", "disk", "CODE-1");
    await expect(add(a, "Second", "disk", "CODE-1")).rejects.toMatchObject({
      code: AssetError.CODE_CONFLICT,
    });
    expect((await repository.findPage(a, { tenantId: 1 })).total).toBe(1);
  });

  it("rejects stale updates and system-field injection", async () => {
    const id = await add();
    await repository.update(a, {
      tenantId: 1,
      id,
      expectedUpdateTimeUtc: null,
      name: "Updated",
      category: "disk",
    });
    const current = await repository.findById(a, id);
    await expect(
      repository.update(a, {
        tenantId: 1,
        id,
        expectedUpdateTimeUtc: null,
        name: "Stale",
        category: "disk",
      })
    ).rejects.toMatchObject({ code: AssetError.STATE_CONFLICT });
    expect(await repository.findById(a, id)).toEqual(current);
    for (const field of [
      "assetId",
      "status",
      "creatorId",
      "retiredTimeUtc",
      "stateReason",
      "updateTimeUtc",
    ]) {
      expect(
        new Validator(AssetAddReq).validate({
          tenantId: 1,
          name: "Test",
          category: "disk",
          [field]: "injected",
        }).valid
      ).toBe(false);
      expect(
        new Validator(AssetUpdateReq).validate({
          tenantId: 1,
          id,
          expectedUpdateTimeUtc: null,
          name: "Test",
          category: "disk",
          [field]: "injected",
        }).valid
      ).toBe(false);
    }
    expect(
      new Validator(IdentifierAddReq).validate({
        ...identifier(id, null),
        normalizedValue: "injected",
      }).valid
    ).toBe(false);
  });

  it.each([
    "N/A",
    "00000000",
    "unknown",
    "To Be Filled By OEM",
    "Default string",
    "FFFFFFFFFFFFFFFF",
  ])("rejects placeholder identifier %s", (value) => {
    expect(() => normalizeIdentifier(identifier(1, null, value))).toThrow();
  });

  it("preserves meaningful SN separators and leading zeroes, and normalizes typed identifiers", () => {
    expect(normalizeIdentifier(identifier(1, null, "  EXAMPLE-0001-a  "))).toBe(
      "EXAMPLE-0001-a"
    );
    expect(
      normalizeIdentifier({
        ...identifier(1, null, "50:00:C5:00:AA:BB:CC:DD"),
        identifierType: "wwn",
      })
    ).toBe("5000c500aabbccdd");
    expect(
      normalizeIdentifier({
        ...identifier(1, null, "GPU-12345678-ABCD-1234-ABCD-123456789ABC"),
        identifierType: "gpu_uuid",
      })
    ).toBe("gpu-12345678-abcd-1234-abcd-123456789abc");
    expect(() =>
      normalizeIdentifier({ ...identifier(1, null), namespace: "" })
    ).toThrow();
  });

  it("enforces verified identifier uniqueness per enterprise and rolls back the asset version on conflict", async () => {
    const first = await add();
    const second = await add(a, "Second");
    const other = await add(b);
    await repository.addIdentifier(
      a,
      identifier(first, null),
      "EXAMPLE-SN-001"
    );
    await expect(
      repository.addIdentifier(a, identifier(second, null), "EXAMPLE-SN-001")
    ).rejects.toMatchObject({ code: AssetError.IDENTIFIER_CONFLICT });
    expect(await version(a, second)).toBeNull();
    await repository.addIdentifier(
      b,
      identifier(other, null, "EXAMPLE-SN-001", 2),
      "EXAMPLE-SN-001"
    );
    expect(
      (await repository.identifiers(b, { tenantId: 2, assetId: other })).total
    ).toBe(1);
  });

  it("keeps weak evidence separate and prevents changing identifiers through a different asset", async () => {
    const first = await add();
    const second = await add(a, "Second");
    const firstInput = {
      ...identifier(first, null),
      isVerified: false,
      confidence: "low" as const,
    };
    const firstIdentifier = await repository.addIdentifier(
      a,
      firstInput,
      "EXAMPLE-SN-001"
    );
    await repository.addIdentifier(
      a,
      { ...firstInput, assetId: second },
      "EXAMPLE-SN-001"
    );
    const oldVersion = await version(a, second);
    await expect(
      repository.updateIdentifier(
        a,
        {
          ...identifier(second, oldVersion),
          id: firstIdentifier,
          expectedUpdateTimeUtc: null,
        },
        "changed"
      )
    ).rejects.toMatchObject({ code: AssetError.STATE_CONFLICT });
    expect(await version(a, second)).toBe(oldVersion);
    expect((await repository.findPage(a, { tenantId: 1 })).total).toBe(2);
  });

  it("protects cross-enterprise relationships with final SQL and composite foreign keys", async () => {
    const disk = await add();
    const foreignHost = await add(b, "Foreign host", "host");
    await expect(assign(disk, foreignHost)).rejects.toMatchObject({
      code: AssetError.STATE_CONFLICT,
    });
    expect(await version(a, disk)).toBeNull();
    await expect(
      db.insert(assetIdentifierTable).values({
        tenantId: 2,
        assetId: disk,
        identifierType: "sn",
        namespace: "fixture",
        value: "SYNTHETIC",
        normalizedValue: "SYNTHETIC",
        source: "fixture",
        confidence: "high",
        isVerified: true,
        creatorId: 102,
        updaterId: null,
        createTimeUtc: start,
        updateTimeUtc: null,
      })
    ).rejects.toBeDefined();
  });

  it("atomically moves a disk between local hosts without changing identity or old installation history", async () => {
    const disk = await add();
    const hostA = await add(a, "Host A", "host");
    const hostB = await add(a, "Host B", "host");
    const publicId = (await repository.findById(a, disk))?.assetId;
    const oldId = await assign(disk, hostA);
    const next = await repository.assign(a, {
      tenantId: 1,
      assetId: disk,
      expectedAssetUpdateTimeUtc: await version(a, disk),
      hostAssetId: hostB,
      location: "New location",
      validFromUtc: start + 1000,
      reason: "Synthetic migration",
      replacesId: oldId,
      expectedUpdateTimeUtc: null,
    });
    const history = (
      await repository.assignments(a, {
        tenantId: 1,
        assetId: disk,
        descend: false,
      })
    ).list;
    expect(
      history.map((row) => [
        row.id,
        row.hostAssetId,
        row.validFromUtc,
        row.validToUtc,
      ])
    ).toEqual([
      [oldId, hostA, start, start + 1000],
      [next, hostB, start + 1000, null],
    ]);
    expect((await repository.findById(a, disk))?.assetId).toBe(publicId);
  });

  it("rejects future and overlapping assignments without advancing versions", async () => {
    const id = await add();
    await assign(id);
    const old = await version(a, id);
    await expect(
      repository.assign(a, {
        tenantId: 1,
        assetId: id,
        expectedAssetUpdateTimeUtc: old,
        hostAssetId: null,
        location: "Overlap",
        validFromUtc: start + 1000,
        reason: "Conflict",
      })
    ).rejects.toBeDefined();
    expect(await version(a, id)).toBe(old);
    await expect(
      repository.assign(a, {
        tenantId: 1,
        assetId: id,
        expectedAssetUpdateTimeUtc: old,
        hostAssetId: null,
        location: "Future",
        validFromUtc: Date.now() + 100_000,
        reason: "Future",
      })
    ).rejects.toBeDefined();
    expect(await version(a, id)).toBe(old);
    expect(
      (await repository.assignments(a, { tenantId: 1, assetId: id })).total
    ).toBe(1);
  });

  it("keeps closed installation intervals immutable and rejects historical overlap while allowing the exact boundary", async () => {
    const id = await add();
    const initial = await assign(id);
    await repository.closeAssignment(a, {
      tenantId: 1,
      assetId: id,
      id: initial,
      expectedAssetUpdateTimeUtc: await version(a, id),
      expectedUpdateTimeUtc: null,
      validToUtc: start + 1000,
      reason: "Synthetic completed installation",
    });
    const closedVersion = await version(a, id);
    await expect(
      repository.closeAssignment(a, {
        tenantId: 1,
        assetId: id,
        id: initial,
        expectedAssetUpdateTimeUtc: closedVersion,
        expectedUpdateTimeUtc: null,
        validToUtc: start + 2000,
        reason: "Attempt to rewrite closed history",
      })
    ).rejects.toMatchObject({ code: AssetError.STATE_CONFLICT });
    await expect(assign(id, null, start + 500)).rejects.toMatchObject({
      code: AssetError.STATE_CONFLICT,
    });
    expect(await version(a, id)).toBe(closedVersion);
    await assign(id, null, start + 1000);
    const rows = (
      await repository.assignments(a, {
        tenantId: 1,
        assetId: id,
        descend: false,
      })
    ).list;
    expect(rows).toHaveLength(2);
    expect(rows[0].validToUtc).toBe(rows[1].validFromUtc);
    expect(rows[0].closeReason).toBe("Synthetic completed installation");
  });

  it("checks binding closure ownership, deadline and exact history boundary without partial version changes", async () => {
    const id = await add();
    const other = await add(a, "Other synthetic asset");
    const initial = await bind(id);
    const assetVersion = await version(a, id);
    const base = {
      tenantId: 1,
      assetId: id,
      id: initial,
      expectedAssetUpdateTimeUtc: assetVersion,
      expectedUpdateTimeUtc: null,
      validToUtc: start + 1000,
      reason: "Synthetic completed mapping",
    };
    await expect(
      repository.closeBinding(a, {
        ...base,
        assetId: other,
        expectedAssetUpdateTimeUtc: null,
      })
    ).rejects.toMatchObject({ code: AssetError.STATE_CONFLICT });
    expect(await version(a, other)).toBeNull();
    await expect(
      repository.closeBinding(a, {
        ...base,
        validToUtc: Date.now() + 100_000,
      })
    ).rejects.toMatchObject({ code: AssetError.STATE_CONFLICT });
    expect(await version(a, id)).toBe(assetVersion);
    await repository.closeBinding(a, base);
    const closedVersion = await version(a, id);
    expect((await resolve(a, start + 999)).status).toBe("matched");
    expect((await resolve(a, start + 1000)).status).toBe("unmapped");
    await expect(bind(id, a, start + 500)).rejects.toMatchObject({
      code: AssetError.STATE_CONFLICT,
    });
    expect(await version(a, id)).toBe(closedVersion);
    await bind(id, a, start + 1000);
    expect((await resolve(a, start + 1000)).status).toBe("matched");
    expect(
      (await repository.bindings(a, { tenantId: 1, assetId: id })).total
    ).toBe(2);
  });

  it("atomically changes the collector key and resolves offline observations using half-open history", async () => {
    const id = await add();
    const first = await bind(id);
    const nextKey = {
      ...source,
      collectorId: "collector-b",
      deviceId: "device-b",
    };
    const next = await repository.bind(a, {
      tenantId: 1,
      assetId: id,
      expectedAssetUpdateTimeUtc: await version(a, id),
      ...nextKey,
      validFromUtc: start + 1000,
      reason: "New collector",
      replacesId: first,
      expectedUpdateTimeUtc: null,
    });
    expect((await resolve(a, start + 999)).mapping?.bindingId).toBe(first);
    expect((await resolve(a, start + 1000)).status).toBe("unmapped");
    expect((await resolve(a, start + 1000, nextKey)).mapping?.bindingId).toBe(
      next
    );
    expect((await resolve(a, start + 999, nextKey)).status).toBe("unmapped");
  });

  it("permits identical source keys in different enterprises and refuses overlapping keys within one enterprise", async () => {
    const first = await add();
    const second = await add(a, "Second");
    const other = await add(b);
    await bind(first);
    await bind(other, b);
    await expect(bind(second)).rejects.toMatchObject({
      code: AssetError.STATE_CONFLICT,
    });
    expect(await version(a, second)).toBeNull();
    expect((await resolve(a, start)).mapping?.assetId).not.toBe(
      (await resolve(b, start)).mapping?.assetId
    );
    expect((await resolve(a, start - 1)).status).toBe("unmapped");
  });

  it("rejects missing replacement versions before any mutation", async () => {
    const id = await add();
    const current = await bind(id);
    const old = await version(a, id);
    await expect(
      service.bind.service(
        {
          tenantId: 1,
          assetId: id,
          expectedAssetUpdateTimeUtc: old,
          ...source,
          validFromUtc: start + 1000,
          reason: "Missing version",
          replacesId: current,
        },
        actor()
      )
    ).rejects.toMatchObject({ code: AssetError.STATE_CONFLICT });
    expect(await version(a, id)).toBe(old);
  });

  it("rolls back an earlier asset CAS when a later relationship condition matches zero rows", async () => {
    const id = await add();
    const previous = await assign(id);
    const old = await version(a, id);
    await expect(
      repository.assign(a, {
        tenantId: 1,
        assetId: id,
        expectedAssetUpdateTimeUtc: old,
        hostAssetId: null,
        location: "New",
        validFromUtc: start + 1000,
        reason: "Stale relation",
        replacesId: previous,
        expectedUpdateTimeUtc: 1,
      })
    ).rejects.toMatchObject({ code: AssetError.STATE_CONFLICT });
    expect(await version(a, id)).toBe(old);
    expect(
      (await repository.assignments(a, { tenantId: 1, assetId: id })).list[0]
        .validToUtc
    ).toBeNull();
  });

  it("rolls back a new relation and asset version when closing the old relation throws", async () => {
    const id = await add();
    const previous = await assign(id);
    const old = await version(a, id);
    await db.run(sql`CREATE TRIGGER synthetic_asset_late_failure BEFORE UPDATE ON enterprise_asset_assignment
      WHEN NEW.close_reason = 'synthetic-late-failure' BEGIN SELECT RAISE(ABORT, 'synthetic late failure'); END`);
    await expect(
      repository.assign(a, {
        tenantId: 1,
        assetId: id,
        expectedAssetUpdateTimeUtc: old,
        hostAssetId: null,
        location: "New",
        validFromUtc: start + 1000,
        reason: "synthetic-late-failure",
        replacesId: previous,
        expectedUpdateTimeUtc: null,
      })
    ).rejects.toBeDefined();
    expect(await version(a, id)).toBe(old);
    const rows = (await repository.assignments(a, { tenantId: 1, assetId: id }))
      .list;
    expect(rows).toHaveLength(1);
    expect(rows[0].validToUtc).toBeNull();
  });

  it("has exactly one winner for concurrent conflicting mapping creates and rolls back the losing asset version", async () => {
    const first = await add();
    const second = await add(a, "Second");
    const results = await Promise.allSettled([bind(first), bind(second)]);
    expect(
      results.filter((result) => result.status === "fulfilled")
    ).toHaveLength(1);
    const versions = [await version(a, first), await version(a, second)];
    expect(versions.filter((value) => value === null)).toHaveLength(1);
    expect((await repository.mappingPage(a, { tenantId: 1 })).total).toBe(1);
  });

  it("enforces live membership after context creation and rejects read-only actors", async () => {
    const context = await getTenantContext(1, actor(103), "edit");
    await db
      .update(tenantMemberTable)
      .set({ isEnabled: false })
      .where(eq(tenantMemberTable.userId, 103));
    await expect(add(context)).rejects.toMatchObject({
      code: AssetError.STATE_CONFLICT,
    });
    expect((await repository.findPage(context, { tenantId: 1 })).total).toBe(0);
    await expect(getTenantContext(1, actor(104), "edit")).rejects.toBeDefined();
    await expect(
      add({
        tenantId: 1,
        principal: { kind: "user", userId: 104 },
        capability: "edit",
      })
    ).rejects.toBeDefined();
  });

  it("does not give machine tokens their creator's memberships and exposes only mapping projections", async () => {
    const id = await add();
    await bind(id);
    await expect(getMappingContext(1, machine())).rejects.toBeDefined();
    await db.insert(tenantApiTokenGrantTable).values({
      tenantId: 1,
      tokenId: 10,
      isEnabled: true,
      creatorId: 101,
      updaterId: null,
      createTimeUtc: start,
      updateTimeUtc: start,
    });
    const context = await getMappingContext(1, machine());
    await expect(getMappingContext(2, machine())).rejects.toBeDefined();
    await expect(
      repository.findPage(context, { tenantId: 1 })
    ).rejects.toBeDefined();
    await expect(
      mappingService.resolve.service(
        { tenantId: 2, ...source, observedTimeUtc: start },
        machine()
      )
    ).rejects.toBeDefined();
    const mapped = await resolve(context, start);
    expect(mapped.status).toBe("matched");
    expect(Object.keys(mapped.mapping ?? {})).not.toContain("normalizedValue");
    expect(Object.keys(mapped.mapping ?? {})).not.toContain("name");
    await db
      .update(tenantApiTokenGrantTable)
      .set({ isEnabled: false })
      .where(eq(tenantApiTokenGrantTable.tokenId, 10));
    expect((await resolve(context, start)).status).toBe("unmapped");
    await expect(getMappingContext(1, machine())).rejects.toBeDefined();
  });

  it("freezes ordinary access including machine reads when the last owner's global account is disabled", async () => {
    const id = await add();
    await bind(id);
    await db.insert(tenantApiTokenGrantTable).values({
      tenantId: 1,
      tokenId: 10,
      isEnabled: true,
      creatorId: 101,
      updaterId: null,
      createTimeUtc: start,
      updateTimeUtc: start,
    });
    const context = await getMappingContext(1, machine());
    await db.run(sql`UPDATE system_user SET is_enabled = 0 WHERE id = 101`);
    await expect(getTenantContext(1, actor(103), "read")).rejects.toBeDefined();
    expect((await resolve(context, start)).status).toBe("unmapped");
    await expect(
      add({
        tenantId: 1,
        principal: { kind: "user", userId: 103 },
        capability: "edit",
      })
    ).rejects.toBeDefined();
  });

  it("retires atomically, preserves past resolution and does not reopen old relations on activation", async () => {
    const id = await add();
    await assign(id);
    await bind(id);
    const publicId = (await repository.findById(a, id))?.assetId;
    await repository.retire(a, {
      tenantId: 1,
      id,
      expectedUpdateTimeUtc: await version(a, id),
      reason: "Synthetic retirement",
    });
    const retired = await repository.findById(a, id);
    expect(retired?.status).toBe("retired");
    expect(retired?.stateReason).toBe("Synthetic retirement");
    expect((await resolve(a, start + 1)).status).toBe("matched");
    expect((await resolve(a, retired!.retiredTimeUtc!)).status).toBe(
      "unmapped"
    );
    expect(
      (await repository.assignments(a, { tenantId: 1, assetId: id })).list[0]
        .validToUtc
    ).toBe(retired?.retiredTimeUtc);
    await expect(bind(id)).rejects.toBeDefined();
    await repository.activate(a, {
      tenantId: 1,
      id,
      expectedUpdateTimeUtc: retired!.updateTimeUtc,
      reason: "Synthetic reactivation",
    });
    expect((await repository.findById(a, id))?.assetId).toBe(publicId);
    expect((await resolve(a, Date.now() + 1000)).status).toBe("unmapped");
  });

  it("rolls back retirement and all earlier closures when a later binding closure fails", async () => {
    const id = await add();
    await assign(id);
    await bind(id);
    const old = await repository.findById(a, id);
    await db.run(sql`CREATE TRIGGER synthetic_asset_late_failure BEFORE UPDATE ON enterprise_asset_measurement_binding
      WHEN NEW.close_reason = 'synthetic-late-failure' BEGIN SELECT RAISE(ABORT, 'synthetic late failure'); END`);
    await expect(
      repository.retire(a, {
        tenantId: 1,
        id,
        expectedUpdateTimeUtc: old!.updateTimeUtc,
        reason: "synthetic-late-failure",
      })
    ).rejects.toBeDefined();
    expect(await repository.findById(a, id)).toEqual(old);
    expect(
      (await repository.assignments(a, { tenantId: 1, assetId: id })).list[0]
        .validToUtc
    ).toBeNull();
    expect(
      (await repository.bindings(a, { tenantId: 1, assetId: id })).list[0]
        .validToUtc
    ).toBeNull();
  });

  it("requires moving installed children before retiring a host", async () => {
    const host = await add(a, "Host", "host");
    const disk = await add();
    const assignment = await assign(disk, host);
    await expect(
      repository.retire(a, {
        tenantId: 1,
        id: host,
        expectedUpdateTimeUtc: null,
        reason: "Host retirement",
      })
    ).rejects.toBeDefined();
    await repository.closeAssignment(a, {
      tenantId: 1,
      assetId: disk,
      id: assignment,
      expectedAssetUpdateTimeUtc: await version(a, disk),
      expectedUpdateTimeUtc: null,
      validToUtc: start + 1000,
      reason: "Remove disk",
    });
    await repository.retire(a, {
      tenantId: 1,
      id: host,
      expectedUpdateTimeUtc: null,
      reason: "Host retirement",
    });
    expect((await repository.findById(a, host))?.status).toBe("retired");
  });

  it("does not duplicate a committed relation when the response is lost and the caller manually retries", async () => {
    const id = await add();
    const input = {
      tenantId: 1,
      assetId: id,
      expectedAssetUpdateTimeUtc: null,
      ...source,
      validFromUtc: start,
      reason: "Synthetic unknown outcome",
    };
    await repository.bind(a, input);
    await expect(repository.bind(a, input)).rejects.toMatchObject({
      code: AssetError.STATE_CONFLICT,
    });
    expect(
      (await repository.bindings(a, { tenantId: 1, assetId: id })).total
    ).toBe(1);
  });

  it("keeps unexpected submission errors unknown rather than translating them into business conflict", async () => {
    const failure = new Error("synthetic connection reset after submit");
    await expect(guardedAssetWrite(() => Promise.reject(failure))).rejects.toBe(
      failure
    );
  });
});
