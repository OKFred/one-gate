import { beforeEach, describe, expect, it } from "vitest";
import { sql, type SQL } from "drizzle-orm";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings, UserObj } from "@hodor/core/types/app";
import { BusinessError } from "@hodor/core/middleware/errorHandler/businessError";
import type { TenantContext } from "../../tenant/context";
import { TenantError } from "../../tenant/errors";
import { assetRepository } from "../repository";
import createAssetApp from "../index";
import { buildCatalog, resolveBatch } from "./domain";
import { getTelemetryContext } from "./context";
import { telemetryRepository } from "./repository";
import { TelemetryError } from "./errors";
import service from "./service";
import type { TelemetryCatalogInput, TelemetryResolveItem } from "./model";

export interface TelemetryTestStore {
  reset(): Promise<void>;
  execute(query: SQL): Promise<void>;
  run<T>(operation: () => Promise<T>): Promise<T>;
  readonly postgres: boolean;
}
export const uuids = {
  a: "11111111-1111-4111-8111-111111111111",
  b: "22222222-2222-4222-8222-222222222222",
  d: "33333333-3333-4333-8333-333333333333",
  e: "44444444-4444-4444-8444-444444444444",
  foreign: "55555555-5555-4555-8555-555555555555",
};
const newToken = "hdr_synthetic_telemetry_new_fixture_only";
const oldToken = "hdr_synthetic_mapping_old_fixture_only";
const missingMappingToken = "hdr_synthetic_missing_mapping_fixture_only";
const context: TenantContext = {
  tenantId: 1,
  principal: { kind: "user", userId: 101 },
  capability: "edit",
};

export function fixtureUser(id = 101): UserObj {
  return {
    id,
    userId: id,
    principal: { kind: "user", userId: id },
    username: `synthetic-telemetry-${id}`,
    token: "synthetic-fixture-only",
    langCode: "en-US",
    isEnabled: true,
    isSuperAdmin: false,
    roleIds: [2],
    permissions: [],
    dataScope: "self_only",
    customDeptIds: [],
    ensureLoaded: async () => undefined,
  };
}
async function hash(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
    ),
  ]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
function truth(store: TelemetryTestStore, value: boolean) {
  return store.postgres
    ? value
      ? sql`TRUE`
      : sql`FALSE`
    : sql`${value ? 1 : 0}`;
}
async function addIdentity(
  store: TelemetryTestStore,
  input: {
    id: number;
    assetId: number;
    type?: string;
    namespace?: string;
    value?: string;
    confidence?: string;
    verified?: boolean;
    start: number;
    update?: number | null;
  }
) {
  await store.execute(sql`INSERT INTO enterprise_asset_identifier(id,tenant_id,asset_id,identifier_type,namespace,value,normalized_value,source,confidence,is_verified,creator_id,updater_id,create_time_utc,update_time_utc)
    VALUES (${input.id},1,${input.assetId},${input.type ?? "wwn"},${input.namespace ?? "storage.wwn"},${input.value ?? "5000000000000001"},${input.value ?? "5000000000000001"},'synthetic fixture',${input.confidence ?? "high"},${truth(store, input.verified ?? true)},101,NULL,${input.start},${input.update ?? null})`);
}
async function seed(store: TelemetryTestStore, start: number) {
  await store.reset();
  await store.execute(sql`INSERT INTO system_role(id,name,is_enabled,permission_count,data_scope,creator_id,create_time_utc,is_deleted)
    VALUES (2,'synthetic-telemetry',${truth(store, true)},1,'all',101,${start},${truth(store, false)})`);
  await store.execute(sql`INSERT INTO system_permission(id,code,name,category,is_enabled,creator_id,create_time_utc)
    VALUES (1,'enterprise.asset.telemetry:read','synthetic telemetry','action',${truth(store, true)},101,${start})`);
  await store.execute(
    sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc) VALUES (2,1,101,${start})`
  );
  for (const id of [101, 102])
    await store.execute(sql`INSERT INTO "system_user"(id,username,password,lang_code,role_id_arr,is_enabled,creator_id,create_time_utc)
      VALUES (${id},${`synthetic-telemetry-${id}`},'synthetic-unused-password','en-US',${JSON.stringify([2])},${truth(store, true)},${id},${start})`);
  for (const id of [1, 2]) {
    const owner = id === 1 ? 101 : 102;
    await store.execute(sql`INSERT INTO enterprise_tenant(id,key,name,is_enabled,recovery_reason,creator_id,updater_id,create_time_utc,update_time_utc)
      VALUES (${id},${`synthetic-telemetry-${id}`},'Synthetic telemetry tenant',${truth(store, true)},NULL,${owner},NULL,${start},${start})`);
    await store.execute(sql`INSERT INTO enterprise_tenant_member(tenant_id,user_id,role,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc)
      VALUES (${id},${owner},'owner',${truth(store, true)},${owner},NULL,${start},${start})`);
  }
  for (const [id, uuid, category, tenantId] of [
    [1, uuids.a, "host", 1],
    [2, uuids.b, "host", 1],
    [3, uuids.d, "disk", 1],
    [4, uuids.e, "disk", 1],
    [5, uuids.foreign, "host", 2],
  ] as const)
    await store.execute(sql`INSERT INTO enterprise_asset(id,tenant_id,asset_id,asset_code,name,category,brand,model,remark,status,retired_time_utc,state_reason,creator_id,updater_id,create_time_utc,update_time_utc)
      VALUES (${id},${tenantId},${uuid},NULL,'Synthetic hardware',${category},NULL,'SIMULATED-DISK',NULL,'active',NULL,NULL,101,NULL,${start},NULL)`);
  await addIdentity(store, { id: 1, assetId: 3, start });
  await addIdentity(store, {
    id: 2,
    assetId: 3,
    type: "sn",
    namespace: "storage.serial",
    value: "SYNTHETIC-0001-a",
    start,
  });
  for (const [id, token, permissions] of [
    [
      10,
      newToken,
      ["enterprise.asset.mapping:read", "enterprise.asset.telemetry:read"],
    ],
    [11, oldToken, ["enterprise.asset.mapping:read"]],
    [12, missingMappingToken, ["enterprise.asset.telemetry:read"]],
  ] as const) {
    await store.execute(sql`INSERT INTO system_api_token(id,name,token_prefix,token_hash,permissions,status,creator_id,create_time_utc)
      VALUES (${id},'Synthetic telemetry token','hdr_synthetic',${await hash(token)},${JSON.stringify(permissions)},'active',101,${start})`);
    await store.execute(sql`INSERT INTO enterprise_tenant_api_token_grant(tenant_id,token_id,is_enabled,creator_id,updater_id,create_time_utc,update_time_utc)
      VALUES (1,${id},${truth(store, true)},101,NULL,${start},${start})`);
  }
}
function app() {
  const instance = new OpenAPIHono<AppBindings>();
  instance.route("/api/v1/enterprise/asset", createAssetApp());
  instance.onError((error, request) =>
    request.json(
      {
        ok: false,
        code:
          error instanceof BusinessError
            ? error.code
            : "UNEXPECTED_TEST_FAILURE",
        data: {},
      },
      403
    )
  );
  return instance;
}
async function catalog(hostAssetId = uuids.a) {
  return telemetryRepository.catalogContent(
    getTelemetryContext(1, fixtureUser()),
    hostAssetId
  );
}
async function assignment(start: number, assetId = 3, hostAssetId = 1) {
  return assetRepository.assign(context, {
    tenantId: 1,
    assetId,
    expectedAssetUpdateTimeUtc: (await assetRepository.findById(
      context,
      assetId
    ))!.updateTimeUtc,
    hostAssetId,
    location: "synthetic",
    validFromUtc: start,
    reason: "Synthetic fixture installation",
  });
}

export function telemetryIntegrationSuite(getStore: () => TelemetryTestStore) {
  let start: number;
  beforeEach(async () => {
    start = Date.now() - 60_000;
    await seed(getStore(), start);
  });
  describe("authorized single-snapshot telemetry catalog", () => {
    it("keeps a valid host visible with an empty disk directory", async () =>
      getStore().run(async () => {
        await getStore().execute(sql`DELETE FROM enterprise_asset_identifier`);
        expect(await catalog()).toMatchObject({
          contractVersion: 1,
          tenantId: 1,
          host: { assetId: uuids.a },
          assets: [],
        });
      }));
    it("deduplicates identifier/assignment join multiplication and retains complete old host history", async () =>
      getStore().run(async () => {
        const previous = await assignment(start);
        const boundary = start + 10_000;
        await assetRepository.assign(context, {
          tenantId: 1,
          assetId: 3,
          expectedAssetUpdateTimeUtc: (await assetRepository.findById(
            context,
            3
          ))!.updateTimeUtc,
          hostAssetId: 2,
          location: "synthetic B",
          validFromUtc: boundary,
          replacesId: previous,
          expectedUpdateTimeUtc: null,
          reason: "Synthetic A to B migration",
        });
        const content = await catalog();
        expect(content.assets).toHaveLength(1);
        expect(content.assets[0].identifiers).toHaveLength(2);
        expect(content.assets[0].assignments).toHaveLength(2);
        const current = await buildCatalog(content, Date.now());
        const items = [boundary - 1, boundary].map((time, index) => ({
          requestId: `at-${index}`,
          observedTimeUtc: time,
          identifiers: [
            {
              identifierType: "wwn",
              namespace: "storage.wwn",
              value: "0x5000000000000001",
            },
          ],
        }));
        const atA = resolveBatch(current, items, Date.now()).results;
        const atB = resolveBatch(
          await buildCatalog(await catalog(uuids.b), Date.now()),
          items,
          Date.now()
        ).results;
        expect(atA.map((row) => row.reasonCode)).toEqual([
          "MATCHED",
          "HOST_MISMATCH",
        ]);
        expect(atB.map((row) => row.reasonCode)).toEqual([
          "HOST_MISMATCH",
          "MATCHED",
        ]);
        expect(atA[0].mapping?.assetId).toBe(uuids.d);
        expect(atB[1].mapping?.assetId).toBe(uuids.d);
        expect(atA[0].mapping?.assignmentId).not.toBe(
          atB[1].mapping?.assignmentId
        );
      }));
    it("filters weak, unverified, unsupported and non-disk identities inside the catalog query", async () =>
      getStore().run(async () => {
        await addIdentity(getStore(), {
          id: 3,
          assetId: 4,
          confidence: "medium",
          value: "5000000000000002",
          start,
        });
        await addIdentity(getStore(), {
          id: 4,
          assetId: 4,
          verified: false,
          value: "5000000000000003",
          start,
        });
        await addIdentity(getStore(), {
          id: 5,
          assetId: 4,
          namespace: "not-supported",
          value: "5000000000000004",
          start,
        });
        await addIdentity(getStore(), {
          id: 6,
          assetId: 1,
          value: "5000000000000005",
          start,
        });
        const result = await catalog();
        expect(result.assets.map((row) => row.assetId)).toEqual([uuids.d]);
        expect(result.assets[0].identifiers).toHaveLength(2);
        expect(JSON.stringify(result)).not.toContain("5000000000000002");
      }));
    it("rejects missing, foreign-tenant and non-host UUIDs with the same invisible result", async () =>
      getStore().run(async () => {
        for (const host of [
          uuids.foreign,
          uuids.d,
          "99999999-9999-4999-8999-999999999999",
        ])
          await expect(catalog(host)).rejects.toMatchObject({
            code: TenantError.NOT_VISIBLE,
          });
        await expect(
          telemetryRepository.catalogContent(
            getTelemetryContext(2, fixtureUser()),
            uuids.foreign
          )
        ).rejects.toMatchObject({ code: TenantError.NOT_VISIBLE });
      }));
    it("keeps identical hardware identities in different tenants in independent catalogs", async () =>
      getStore().run(async () => {
        const foreignDisk = "66666666-6666-4666-8666-666666666666";
        await getStore()
          .execute(sql`INSERT INTO enterprise_asset(id,tenant_id,asset_id,name,category,model,status,creator_id,create_time_utc)
          VALUES (6,2,${foreignDisk},'Other tenant synthetic disk','disk','OTHER-SYNTHETIC','active',102,${start})`);
        await getStore()
          .execute(sql`INSERT INTO enterprise_asset_identifier(id,tenant_id,asset_id,identifier_type,namespace,value,normalized_value,source,confidence,is_verified,creator_id,create_time_utc)
          VALUES (3,2,6,'wwn','storage.wwn','5000000000000001','5000000000000001','other synthetic tenant','high',${truth(getStore(), true)},102,${start})`);
        const local = await catalog();
        const foreign = await telemetryRepository.catalogContent(
          getTelemetryContext(2, fixtureUser(102)),
          uuids.foreign
        );
        expect(local.assets.map((row) => row.assetId)).toEqual([uuids.d]);
        expect(foreign.assets.map((row) => row.assetId)).toEqual([foreignDisk]);
        expect(JSON.stringify(local)).not.toContain("OTHER-SYNTHETIC");
      }));
    it("uses identifier audit time for WWN and asset audit time additionally for serial identity", async () =>
      getStore().run(async () => {
        await getStore().execute(
          sql`UPDATE enterprise_asset SET update_time_utc = ${start + 2000} WHERE id = 3`
        );
        await getStore().execute(
          sql`UPDATE enterprise_asset_identifier SET update_time_utc = ${start + 1000} WHERE asset_id = 3`
        );
        const identifiers = (await catalog()).assets[0].identifiers;
        expect(
          identifiers.find((row) => row.identifierType === "wwn")
            ?.effectiveFromUtc
        ).toBe(start + 1000);
        expect(
          identifiers.find((row) => row.identifierType === "sn")
            ?.effectiveFromUtc
        ).toBe(start + 2000);
      }));
    it("keeps retired disks and hosts available for historical observations only", async () =>
      getStore().run(async () => {
        await assignment(start);
        const retiredAt = start + 10_000;
        await getStore().execute(
          sql`UPDATE enterprise_asset SET status='retired',retired_time_utc=${retiredAt} WHERE id IN (1,3)`
        );
        const current = await buildCatalog(await catalog(), Date.now());
        const result = resolveBatch(
          current,
          [retiredAt - 1, retiredAt].map((observedTimeUtc, index) => ({
            requestId: `retired-${index}`,
            observedTimeUtc,
            identifiers: [
              {
                identifierType: "wwn",
                namespace: "storage.wwn",
                value: "5000000000000001",
              },
            ],
          })),
          Date.now()
        );
        expect(result.results.map((row) => row.reasonCode)).toEqual([
          "MATCHED",
          "ASSET_RETIRED",
        ]);
      }));
    it("rechecks human permission and tenant membership at SQL execution after context construction", async () =>
      getStore().run(async () => {
        const cached = getTelemetryContext(1, fixtureUser());
        await getStore().execute(sql`DELETE FROM system_role_permission`);
        await expect(
          telemetryRepository.catalogContent(cached, uuids.a)
        ).rejects.toMatchObject({ code: TenantError.NOT_VISIBLE });
        await getStore().execute(
          sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc) VALUES (2,1,101,${start})`
        );
        await getStore().execute(
          sql`UPDATE enterprise_tenant_member SET is_enabled=${truth(getStore(), false)} WHERE tenant_id=1`
        );
        await expect(
          telemetryRepository.catalogContent(cached, uuids.a)
        ).rejects.toMatchObject({ code: TenantError.NOT_VISIBLE });
      }));
    it("rejects the entire catalog when the bounded join sentinel detects more than 5000 rows", async () =>
      getStore().run(async () => {
        for (let batch = 0; batch < 6; batch += 1) {
          const first = batch * 850 + 1;
          await getStore()
            .execute(sql`WITH RECURSIVE fixture_number(n) AS (SELECT CAST(${first} AS BIGINT) UNION ALL SELECT n+1 FROM fixture_number WHERE n < ${first + 849})
          INSERT INTO enterprise_asset_assignment(tenant_id,asset_id,host_asset_id,location,valid_from_utc,valid_to_utc,reason,close_reason,creator_id,updater_id,create_time_utc,update_time_utc)
          SELECT 1,3,1,'synthetic bounded query',(n * 2), (n * 2 + 1),'synthetic history',NULL,101,NULL,${start},NULL FROM fixture_number`);
        }
        await expect(catalog()).rejects.toMatchObject({
          code: TelemetryError.CATALOG_TOO_LARGE,
        });
      }));
  });
  describe("telemetry HTTP authorization and contract", () => {
    async function post(path: string, data: object, token = newToken) {
      return getStore().run(async () =>
        app().request(`/api/v1/enterprise/asset${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })
      );
    }
    const input: TelemetryCatalogInput = {
      contractVersion: 1,
      tenantId: 1,
      hostAssetId: uuids.a,
    };
    it("returns private no-store catalogs and resolves a batch from the same contract", async () => {
      await getStore().run(() => assignment(start));
      const response = await post("/telemetry/catalog", input);
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(await response.json()).toMatchObject({
        ok: true,
        data: {
          host: { assetId: uuids.a },
          assets: [{ assetId: uuids.d }],
          revision: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
        },
      });
      const resolved = await post("/telemetry/resolveBatch", {
        ...input,
        items: [
          {
            requestId: "http-synthetic",
            observedTimeUtc: start + 1,
            identifiers: [
              {
                identifierType: "wwn",
                namespace: "storage.wwn",
                value: "5000000000000001",
              },
            ],
          },
        ],
      });
      expect(resolved.status).toBe(200);
      expect(resolved.headers.get("Cache-Control")).toBe("private, no-store");
      expect(await resolved.json()).toMatchObject({
        ok: true,
        data: {
          results: [{ status: "matched", mapping: { assetId: uuids.d } }],
        },
      });
    });
    it("does not grant hardware identity access to old mapping-only tokens or telemetry-only tokens without mapping capability", async () => {
      expect((await post("/telemetry/catalog", input, oldToken)).status).toBe(
        403
      );
      expect(
        (await post("/telemetry/catalog", input, missingMappingToken)).status
      ).toBe(403);
      const old = await post("/mapping/list", { tenantId: 1 }, oldToken);
      expect(old.status).toBe(200);
      expect(await old.json()).toMatchObject({ ok: true, data: { list: [] } });
    });
    it("refuses token/grant/owner/tenant revocation and never leaks catalog identifiers on rejection", async () => {
      for (const mutation of [
        sql`UPDATE system_api_token SET status='revoked' WHERE id=10`,
        sql`UPDATE enterprise_tenant_api_token_grant SET is_enabled=${truth(getStore(), false)} WHERE token_id=10`,
        sql`UPDATE "system_user" SET is_enabled=${truth(getStore(), false)} WHERE id=101`,
        sql`UPDATE enterprise_tenant SET is_enabled=${truth(getStore(), false)} WHERE id=1`,
      ]) {
        await getStore().execute(mutation);
        const response = await post("/telemetry/catalog", input);
        expect(response.status).toBe(403);
        expect(await response.text()).not.toContain("5000000000000001");
        await seed(getStore(), start);
      }
    });
    it("rejects client-selected permission overrides and invalid contract versions", async () => {
      for (const data of [
        { ...input, permissionCode: "enterprise.asset.mapping:read" },
        { ...input, contractVersion: 2 },
      ]) {
        const response = await post("/telemetry/catalog", data);
        expect(response.status).toBe(403);
      }
    });
    it("uses the same service snapshot and rejects duplicate batch request identifiers", async () =>
      getStore().run(async () => {
        const current = await service.catalog.service(input, fixtureUser());
        expect(current.assets[0].identifiers).toHaveLength(2);
        const item: TelemetryResolveItem = {
          requestId: "duplicate",
          observedTimeUtc: start,
          identifiers: [],
        };
        await expect(
          service.resolveBatch.service(
            { ...input, items: [item, item] },
            fixtureUser()
          )
        ).rejects.toBeDefined();
      }));
  });
}
