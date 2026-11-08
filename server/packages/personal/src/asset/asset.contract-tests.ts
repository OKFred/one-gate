import { beforeEach, describe, expect, it, vi } from "vitest";
import { sql, type SQL } from "drizzle-orm";
import type { UserObj } from "@hodor/core/types/app";
import { registry as enterprise } from "@hodor/enterprise/common/registry";
import { overviewPersonalAssets, placePersonalAsset } from "./service";
import { getPlacementRepository } from "./repository";
import type { AssetPlaceRequest } from "./model";

export interface AssetTestStore {
  readonly postgres: boolean;
  reset(): Promise<void>;
  execute(query: SQL): Promise<void>;
  query<T extends Record<string, unknown>>(query: SQL): Promise<T[]>;
  run<T>(operation: () => Promise<T>): Promise<T>;
}

export const assetIds = {
  hostA: "11111111-1111-4111-8111-111111111111",
  disk: "22222222-2222-4222-8222-222222222222",
  hostB: "33333333-3333-4333-8333-333333333333",
  foreign: "44444444-4444-4444-8444-444444444444",
};
export const boundary = Date.UTC(2026, 10, 8, 12);

export function assetActor(id = 101): UserObj {
  return {
    principal: { kind: "user", userId: id },
    id,
    userId: id,
    username: `synthetic-asset-${id}`,
    langCode: "en-US",
    isEnabled: true,
    token: "synthetic-fixture-only",
    isSuperAdmin: false,
    roleIds: [2],
    permissions: [],
    dataScope: "self_only",
    customDeptIds: [],
    ensureLoaded: async () => undefined,
  };
}

export function placementInput(
  overrides: Partial<AssetPlaceRequest> = {}
): AssetPlaceRequest {
  return {
    tenantId: 1,
    assetId: assetIds.disk,
    site: "OpenMind",
    floor: 3,
    expectedVersion: null,
    ...overrides,
  };
}

function truth(store: AssetTestStore, value: boolean): SQL {
  return store.postgres
    ? value
      ? sql`TRUE`
      : sql`FALSE`
    : sql`${value ? 1 : 0}`;
}

export async function seedAssets(store: AssetTestStore): Promise<void> {
  await store.reset();
  await store.execute(sql`INSERT INTO system_role(id,name,is_enabled,permission_count,data_scope,creator_id,create_time_utc,is_deleted)
    VALUES(2,'synthetic-asset-role',${truth(store, true)},3,'all',101,1,${truth(store, false)})`);
  for (const [index, code] of [
    "enterprise.asset:read",
    "personal.asset:read",
    "personal.asset:update",
  ].entries()) {
    await store.execute(sql`INSERT INTO system_permission(id,code,name,category,is_enabled,creator_id,create_time_utc)
      VALUES(${index + 1},${code},${code},'action',${truth(store, true)},101,1)`);
    await store.execute(
      sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc) VALUES(2,${index + 1},101,1)`
    );
  }
  for (const id of [101, 102, 103])
    await store.execute(sql`INSERT INTO "system_user"(id,username,password,lang_code,role_id_arr,is_enabled,creator_id,create_time_utc)
      VALUES(${id},${`synthetic-asset-${id}`},'synthetic-not-a-password','en-US',${JSON.stringify([2])},${truth(store, true)},101,1)`);
  for (const id of [1, 2]) {
    await store.execute(sql`INSERT INTO enterprise_tenant(id,key,name,is_enabled,creator_id,create_time_utc,update_time_utc)
      VALUES(${id},${`synthetic-asset-${id}`},'Synthetic tenant',${truth(store, true)},101,1,1)`);
    await store.execute(sql`INSERT INTO enterprise_tenant_member(tenant_id,user_id,role,is_enabled,creator_id,create_time_utc,update_time_utc)
      VALUES(${id},${id === 1 ? 101 : 103},'owner',${truth(store, true)},101,1,1)`);
  }
  await store.execute(sql`INSERT INTO enterprise_tenant_member(tenant_id,user_id,role,is_enabled,creator_id,create_time_utc,update_time_utc)
    VALUES(1,102,'viewer',${truth(store, true)},101,1,1)`);
  for (const [id, uuid, category, tenant] of [
    [1, assetIds.hostA, "host", 1],
    [2, assetIds.disk, "disk", 1],
    [3, assetIds.hostB, "host", 1],
    [4, assetIds.foreign, "host", 2],
  ] as const)
    await store.execute(sql`INSERT INTO enterprise_asset(id,tenant_id,asset_id,name,category,remark,status,creator_id,create_time_utc)
      VALUES(${id},${tenant},${uuid},${`Synthetic ${category} ${id}`},${category},'private source remark','active',101,1)`);
  for (const [id, host, start, end] of [
    [1, 1, boundary - 10000, boundary],
    [2, 3, boundary, null],
  ] as const)
    await store.execute(sql`INSERT INTO enterprise_asset_assignment(id,tenant_id,asset_id,host_asset_id,location,valid_from_utc,valid_to_utc,reason,creator_id,create_time_utc)
      VALUES(${id},1,2,${host},'private source location',${start},${end},'synthetic relation',101,1)`);
}

export function assetContractTests(store: AssetTestStore): void {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await seedAssets(store);
    vi.spyOn(Date, "now").mockReturnValue(boundary);
  });
  describe("private asset projection and placement", () => {
    it("returns only the minimal projection with honest unknown presence and half-open host UUIDs", () =>
      store.run(async () => {
        const snapshot = await overviewPersonalAssets(
          { tenantId: 1 },
          assetActor()
        );
        expect(snapshot.assets).toHaveLength(3);
        expect(snapshot.presenceSource).toBe("unconfigured");
        const disk = snapshot.assets.find(
          (asset) => asset.assetId === assetIds.disk
        );
        expect(disk).toEqual({
          assetId: assetIds.disk,
          name: "Synthetic disk 2",
          category: "disk",
          inventoryStatus: "active",
          hostAssetId: assetIds.hostB,
          placement: {
            site: null,
            floor: null,
            version: null,
            updateTimeUtc: null,
          },
          presence: {
            status: "unknown",
            basis: "not_connected",
            lastHeartbeatTimeUtc: null,
            observedTimeUtc: null,
            expiresTimeUtc: null,
          },
        });
        vi.spyOn(Date, "now").mockReturnValue(boundary - 1);
        expect(
          (
            await overviewPersonalAssets({ tenantId: 1 }, assetActor())
          ).assets.find((asset) => asset.assetId === assetIds.disk)?.hostAssetId
        ).toBe(assetIds.hostA);
        expect(JSON.stringify(snapshot)).not.toContain("private source");
        expect(JSON.stringify(snapshot)).not.toContain("identifier");
      }));
    it("keeps owner placements private and resets to unknown without changing source records", () =>
      store.run(async () => {
        const before = await store.query(
          sql`SELECT * FROM enterprise_asset ORDER BY id`
        );
        const assignmentBefore = await store.query(
          sql`SELECT * FROM enterprise_asset_assignment ORDER BY id`
        );
        expect(
          await placePersonalAsset(placementInput(), assetActor())
        ).toMatchObject({ site: "OpenMind", floor: 3, version: 1 });
        expect(
          (
            await overviewPersonalAssets({ tenantId: 1 }, assetActor(102))
          ).assets.find((row) => row.assetId === assetIds.disk)?.placement
            .version
        ).toBeNull();
        expect(
          await placePersonalAsset(
            placementInput({ site: "OpenLife", floor: 1 }),
            assetActor(102)
          )
        ).toMatchObject({ site: "OpenLife", floor: 1, version: 1 });
        expect(
          await placePersonalAsset(
            placementInput({ site: null, floor: null, expectedVersion: 1 }),
            assetActor()
          )
        ).toEqual({
          site: null,
          floor: null,
          version: 2,
          updateTimeUtc: boundary,
        });
        expect(
          await store.query(sql`SELECT * FROM enterprise_asset ORDER BY id`)
        ).toEqual(before);
        expect(
          await store.query(
            sql`SELECT * FROM enterprise_asset_assignment ORDER BY id`
          )
        ).toEqual(assignmentBefore);
      }));
    it("rejects stale creates, missing updates and concurrent versions", () =>
      store.run(async () => {
        await expect(
          placePersonalAsset(
            placementInput({ expectedVersion: 1 }),
            assetActor()
          )
        ).rejects.toMatchObject({ status: 409 });
        await placePersonalAsset(placementInput(), assetActor());
        await expect(
          placePersonalAsset(placementInput(), assetActor())
        ).rejects.toMatchObject({ status: 409 });
        const outcomes = await Promise.allSettled([
          placePersonalAsset(
            placementInput({ expectedVersion: 1, floor: 1 }),
            assetActor()
          ),
          placePersonalAsset(
            placementInput({ expectedVersion: 1, floor: 4 }),
            assetActor()
          ),
        ]);
        expect(
          outcomes.filter((result) => result.status === "fulfilled")
        ).toHaveLength(1);
        expect(
          outcomes.filter((result) => result.status === "rejected")
        ).toHaveLength(1);
      }));
    it("rejects invalid location pairs and preserves retired inventory status", () =>
      store.run(async () => {
        for (const value of [
          placementInput({ site: null, floor: 1 }),
          placementInput({ site: "OpenLife", floor: 2 }),
          placementInput({ site: "OpenMind", floor: null }),
        ])
          await expect(
            placePersonalAsset(value, assetActor())
          ).rejects.toMatchObject({ status: 400 });
        await store.execute(
          sql`UPDATE enterprise_asset SET status='retired',retired_time_utc=1 WHERE id=2`
        );
        await placePersonalAsset(placementInput(), assetActor());
        expect(
          (
            await overviewPersonalAssets({ tenantId: 1 }, assetActor())
          ).assets.find((row) => row.assetId === assetIds.disk)?.inventoryStatus
        ).toBe("retired");
      }));
    it("denies cross-tenant and machine access even with a claimed superadmin flag", () =>
      store.run(async () => {
        await expect(
          overviewPersonalAssets(
            { tenantId: 1 },
            { ...assetActor(103), isSuperAdmin: true }
          )
        ).rejects.toBeDefined();
        await expect(
          placePersonalAsset(
            placementInput({ assetId: assetIds.foreign }),
            assetActor()
          )
        ).rejects.toBeDefined();
        const token = {
          ...assetActor(),
          principal: { kind: "api_token" as const, tokenId: 12 },
        };
        await expect(
          overviewPersonalAssets({ tenantId: 1 }, token)
        ).rejects.toBeDefined();
        await expect(
          placePersonalAsset(placementInput(), token)
        ).rejects.toBeDefined();
      }));
    it("rechecks source permission in the final write after an earlier successful check", () =>
      store.run(async () => {
        const actor = assetActor();
        const guard = enterprise.assetProjection.readableAssetSql(
          1,
          assetIds.disk,
          actor
        );
        await enterprise.assetProjection.assertReadable(
          1,
          assetIds.disk,
          actor
        );
        await store.execute(
          sql`DELETE FROM system_role_permission WHERE permission_id=1`
        );
        expect(
          await getPlacementRepository().place(
            101,
            placementInput(),
            guard,
            boundary
          )
        ).toBeNull();
        await expect(
          overviewPersonalAssets({ tenantId: 1 }, actor)
        ).rejects.toBeDefined();
        expect(
          await store.query(sql`SELECT * FROM personal_asset_placement`)
        ).toHaveLength(0);
      }));
    it("rechecks personal update permission in the write and freezes tenants without an active owner", () =>
      store.run(async () => {
        const guard = enterprise.assetProjection.readableAssetSql(
          1,
          assetIds.disk,
          assetActor()
        );
        await store.execute(
          sql`DELETE FROM system_role_permission WHERE permission_id=3`
        );
        expect(
          await getPlacementRepository().place(
            101,
            placementInput(),
            guard,
            boundary
          )
        ).toBeNull();
        await store.execute(
          sql`UPDATE enterprise_tenant_member SET is_enabled=${truth(store, false)} WHERE tenant_id=1 AND role='owner'`
        );
        expect(
          await getPlacementRepository().place(
            101,
            placementInput(),
            guard,
            boundary
          )
        ).toBeNull();
        await expect(
          overviewPersonalAssets({ tenantId: 1 }, assetActor(102))
        ).rejects.toBeDefined();
      }));
    it("fails clearly rather than silently truncating inventories above 1000 assets", () =>
      store.run(async () => {
        await store.execute(sql`WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n<1000)
        INSERT INTO enterprise_asset(id,tenant_id,asset_id,name,category,status,creator_id,create_time_utc)
        SELECT n+100,1,'overflow-' || n,'Synthetic extra','other','active',101,1 FROM numbers`);
        await expect(
          overviewPersonalAssets({ tenantId: 1 }, assetActor())
        ).rejects.toMatchObject({
          status: 413,
          cause: { error: { code: "ASSET_PROJECTION_LIMIT_EXCEEDED" } },
        });
      }));
  });
}
