import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import { getKV } from "@hodor/core/middleware/cache";
import errorHandler from "@hodor/core/middleware/errorHandler";
import { BusinessErrorCode } from "@hodor/core/middleware/errorHandler/businessError";
import type { AppBindings } from "@hodor/core/types/app";
import { getEnv, setEnv } from "@hodor/core/utils/env";
import { tokenUtils } from "@hodor/core/utils/token";
import { initAdminRegistry } from "@hodor/admin/register";
import { userTable } from "@hodor/admin/system/user/model";
import { roleTable } from "@hodor/admin/system/role/model";
import { permissionTable } from "@hodor/admin/system/permission/model";
import { rolePermissionTable } from "@hodor/admin/system/role_permission/model";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import tokenSql from "@hodor/core/db/sql/admin/system_api_token.sql?raw";
import translationSql from "@hodor/core/db/sql/admin/i18n_translation.sql?raw";
import tenantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant.sql?raw";
import memberSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_member.sql?raw";
import grantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_api_token_grant.sql?raw";
import assetSql from "@hodor/core/db/sql/enterprise/enterprise_asset.sql?raw";
import identifierSql from "@hodor/core/db/sql/enterprise/enterprise_asset_identifier.sql?raw";
import assignmentSql from "@hodor/core/db/sql/enterprise/enterprise_asset_assignment.sql?raw";
import bindingSql from "@hodor/core/db/sql/enterprise/enterprise_asset_measurement_binding.sql?raw";
import createTenantApp from "./index";
import createAssetApp from "../asset/index";
import { TenantError } from "./errors";
import { AssetError } from "../asset/errors";
import {
  tenantTable,
  tenantMemberTable,
  tenantApiTokenGrantTable,
} from "./model";
import { assetTable, assetMeasurementBindingTable } from "../asset/model";

const cache = getKV();
const machineToken = "hdr_synthetic-enterprise-route-token";
const prefix = "/api/v1/enterprise";
const permissionCodes = [
  "enterprise.tenant:read",
  "enterprise.tenant:add",
  "enterprise.tenant:edit",
  "enterprise.asset:read",
  "enterprise.asset:add",
  "enterprise.asset:edit",
  "enterprise.asset.mapping:read",
];
const source = {
  sourceSystem: "synthetic-telemetry",
  collectorId: "synthetic-collector",
  deviceId: "synthetic-device",
  metric: "temperature_c",
  channel: "disk",
};
const tasks: Promise<unknown>[] = [];
let observedTimeUtc: number;
let app: OpenAPIHono<AppBindings>;
let publicId: string;

interface Envelope {
  ok: boolean;
  message: string;
  data: unknown;
}

async function post(
  path: string,
  body: object,
  identity: number | string = 101
) {
  const token =
    typeof identity === "number"
      ? tokenUtils.generateToken({
          userId: identity,
          username: `fixture-${identity}`,
        })
      : identity;
  const response = await app.request(
    `http://localhost${prefix}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
    {},
    {
      waitUntil: (task) => {
        tasks.push(task);
      },
      passThroughOnException() {},
      props: {},
    }
  );
  await Promise.all(tasks.splice(0));
  return { status: response.status, body: (await response.json()) as Envelope };
}

function denied(
  result: Awaited<ReturnType<typeof post>>,
  code: string,
  status = 200
) {
  expect(result.status).toBe(status);
  expect(result.body).toMatchObject({ ok: false, data: { code } });
}

describe("enterprise HTTP authentication, RBAC and tenant boundaries", () => {
  const previous = {
    JWT_SECRET: getEnv("JWT_SECRET"),
    BASE_API_PATH: getEnv("BASE_API_PATH"),
    LOCALE: getEnv("LOCALE"),
  };

  beforeAll(async () => {
    setEnv({
      JWT_SECRET: "synthetic-enterprise-route-secret",
      BASE_API_PATH: "/api/v1",
      LOCALE: "en-US",
    });
    initAdminRegistry();
    await setupTestDb(db, [
      userSql,
      roleSql,
      permissionSql,
      rolePermissionSql,
      tokenSql,
      translationSql,
      tenantSql,
      memberSql,
      grantSql,
      assetSql,
      identifierSql,
      assignmentSql,
      bindingSql,
    ]);
    app = new OpenAPIHono<AppBindings>();
    app.route(`${prefix}/tenant`, createTenantApp());
    app.route(`${prefix}/asset`, createAssetApp());
    errorHandler(app);
  });

  beforeEach(async () => {
    await cache.clear();
    await clearTestData(db, [
      "enterprise_asset_measurement_binding",
      "enterprise_asset_assignment",
      "enterprise_asset_identifier",
      "enterprise_asset",
      "enterprise_tenant_api_token_grant",
      "enterprise_tenant_member",
      "enterprise_tenant",
      "system_role_permission",
      "system_permission",
      "system_api_token",
      "system_user",
      "system_role",
      "i18n_translation",
    ]);
    observedTimeUtc = Date.now() - 60_000;
    publicId = crypto.randomUUID();
    for (const id of [1, 10, 11]) {
      await db.insert(roleTable).values({
        id,
        name: `fixture-role-${id}`,
        isEnabled: true,
        isDeleted: false,
        deletedTimeUtc: null,
        deleterId: null,
        dataScope: "self_only",
        customDeptIds: null,
        permissionCount: 0,
        creatorId: 1,
        createTimeUtc: observedTimeUtc,
        updateTimeUtc: null,
      });
    }
    for (const [index, code] of permissionCodes.entries()) {
      await db.insert(permissionTable).values({
        id: index + 1,
        code,
        name: code,
        category: "action",
        business: code.split(":")[0],
        resource: null,
        remark: null,
        isEnabled: true,
        creatorId: 1,
        createTimeUtc: observedTimeUtc,
      });
      await db
        .insert(rolePermissionTable)
        .values({ roleId: 10, permissionId: index + 1, creatorId: 1 });
      if (code.endsWith(":read")) {
        await db
          .insert(rolePermissionTable)
          .values({ roleId: 11, permissionId: index + 1, creatorId: 1 });
      }
    }
    for (const [id, roles] of [
      [1, [1]],
      [101, [10]],
      [102, [10]],
      [103, [10]],
      [104, []],
      [105, [10]],
      [106, [11]],
    ] as const) {
      await db.insert(userTable).values({
        id,
        username: `fixture-${id}`,
        password: "synthetic-unused-hash",
        langCode: "en-US",
        isEnabled: true,
        roleIdArr: [...roles],
        creatorId: 1,
        createTimeUtc: observedTimeUtc,
      });
    }
    for (const id of [1, 2]) {
      await db.insert(tenantTable).values({
        id,
        key: `fixture-${id}`,
        name: `Enterprise ${id}`,
        isEnabled: true,
        recoveryReason: null,
        creatorId: 1,
        updaterId: null,
        createTimeUtc: observedTimeUtc,
        updateTimeUtc: observedTimeUtc,
      });
    }
    for (const [tenantId, userId, role] of [
      [1, 101, "owner"],
      [2, 102, "owner"],
      [1, 103, "viewer"],
      [1, 104, "editor"],
      [1, 106, "editor"],
    ] as const) {
      await db.insert(tenantMemberTable).values({
        tenantId,
        userId,
        role,
        isEnabled: true,
        creatorId: 1,
        updaterId: null,
        createTimeUtc: observedTimeUtc,
        updateTimeUtc: observedTimeUtc,
      });
    }
    for (const [id, tenantId] of [
      [501, 1],
      [502, 2],
    ] as const) {
      await db.insert(assetTable).values({
        id,
        tenantId,
        assetId: id === 501 ? publicId : crypto.randomUUID(),
        name: `Private asset ${tenantId}`,
        assetCode: null,
        category: "disk",
        brand: null,
        model: null,
        remark: null,
        status: "active",
        retiredTimeUtc: null,
        stateReason: null,
        creatorId: tenantId === 1 ? 101 : 102,
        updaterId: null,
        createTimeUtc: observedTimeUtc,
        updateTimeUtc: null,
      });
    }
    await db.insert(assetMeasurementBindingTable).values({
      id: 601,
      tenantId: 1,
      assetId: 501,
      ...source,
      validFromUtc: observedTimeUtc,
      validToUtc: null,
      reason: "Synthetic mapping",
      closeReason: null,
      creatorId: 101,
      updaterId: null,
      createTimeUtc: observedTimeUtc,
      updateTimeUtc: null,
    });
    await db.run(sql`INSERT INTO system_api_token (id,name,token_prefix,token_hash,permissions,status,creator_id)
      VALUES (10,'Synthetic HTTP token','hdr_synthetic',${crypto.createHash("sha256").update(machineToken).digest("hex")},
      ${JSON.stringify(permissionCodes)},'active',101)`);
    await db.insert(tenantApiTokenGrantTable).values({
      tenantId: 1,
      tokenId: 10,
      isEnabled: true,
      creatorId: 101,
      updaterId: null,
      createTimeUtc: observedTimeUtc,
      updateTimeUtc: observedTimeUtc,
    });
  });

  afterEach(async () => {
    await Promise.all(tasks.splice(0));
  });
  afterAll(() => setEnv(previous));

  it("executes real POST services only when both system RBAC and enterprise membership allow them", async () => {
    const created = await post("/asset/add", {
      tenantId: 1,
      name: "HTTP created asset",
      category: "disk",
    });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ ok: true, data: expect.any(Number) });
    const list = await post("/asset/list", { tenantId: 1 });
    expect(list.body).toMatchObject({ ok: true, data: { total: 2 } });
    expect(JSON.stringify(list.body)).not.toContain("Private asset 2");
    expect((await post("/tenant/list", {})).body).toMatchObject({
      ok: true,
      data: {
        total: 1,
        canManagePlatform: false,
        list: [{ id: 1, memberRole: "owner", frozen: false }],
      },
    });
  });

  it("rejects a member with no system permission before its real service runs", async () => {
    for (const path of ["/asset/list", "/tenant/list"]) {
      denied(
        await post(path, path === "/asset/list" ? { tenantId: 1 } : {}, 104),
        BusinessErrorCode.PERMISSION_DENIED,
        403
      );
    }
    denied(
      await post(
        "/asset/add",
        { tenantId: 1, name: "Denied", category: "disk" },
        104
      ),
      BusinessErrorCode.PERMISSION_DENIED,
      403
    );
    expect((await post("/asset/list", { tenantId: 1 })).body).toMatchObject({
      data: { total: 1 },
    });
  });

  it("rejects RBAC-authorized users without membership equally for an existing and missing enterprise", async () => {
    const foreign = await post("/asset/list", { tenantId: 1 }, 105);
    const missing = await post("/asset/list", { tenantId: 999 }, 105);
    denied(foreign, TenantError.NOT_VISIBLE);
    expect(missing).toEqual(foreign);
    expect((await post("/tenant/list", {}, 105)).body).toMatchObject({
      ok: true,
      data: { total: 0, list: [] },
    });
  });

  it("allows explicit platform management but never grants super administrators implicit asset membership", async () => {
    expect((await post("/tenant/platformList", {}, 1)).body).toMatchObject({
      ok: true,
      data: { total: 2, canManagePlatform: true },
    });
    denied(
      await post("/asset/list", { tenantId: 1 }, 1),
      TenantError.NOT_VISIBLE
    );
    denied(
      await post("/tenant/platformList", {}, 101),
      TenantError.PLATFORM_REQUIRED
    );
  });

  it("enforces both the member capability and the endpoint's RBAC action", async () => {
    expect(
      (await post("/asset/get", { tenantId: 1, id: 501 }, 103)).body
    ).toMatchObject({ ok: true, data: { id: 501 } });
    denied(
      await post(
        "/asset/add",
        { tenantId: 1, name: "Viewer write", category: "disk" },
        103
      ),
      TenantError.NOT_VISIBLE
    );
    denied(
      await post(
        "/asset/add",
        { tenantId: 1, name: "Read-only role write", category: "disk" },
        106
      ),
      BusinessErrorCode.PERMISSION_DENIED,
      403
    );
  });

  it("returns the same HTTP error for foreign and absent record IDs without disclosing business data", async () => {
    const foreign = await post("/asset/get", { tenantId: 1, id: 502 });
    const missing = await post("/asset/get", { tenantId: 1, id: 999 });
    denied(foreign, AssetError.NOT_VISIBLE);
    expect(missing).toEqual(foreign);
    expect(JSON.stringify(foreign)).not.toContain("Private asset 2");
  });

  it("validates real route DTOs and rejects identity fields or absent expected versions before writing", async () => {
    denied(
      await post("/asset/add", {
        tenantId: 1,
        name: "Injected",
        category: "disk",
        principal: { kind: "user", userId: 1 },
      }),
      BusinessErrorCode.VALIDATION_FAILED,
      422
    );
    denied(
      await post("/asset/update", {
        tenantId: 1,
        id: 501,
        name: "Missing version",
        category: "disk",
      }),
      BusinessErrorCode.VALIDATION_FAILED,
      422
    );
    expect(
      (await post("/asset/get", { tenantId: 1, id: 501 })).body
    ).toMatchObject({
      ok: true,
      data: { name: "Private asset 1", updateTimeUtc: null },
    });
  });

  it("authenticates a real machine token but limits it to the explicit tenant's minimal mapping projection", async () => {
    const mapped = await post(
      "/asset/mapping/resolve",
      { tenantId: 1, ...source, observedTimeUtc },
      machineToken
    );
    expect(mapped.body).toMatchObject({
      ok: true,
      data: {
        status: "matched",
        mapping: { assetId: publicId, bindingId: 601 },
      },
    });
    const serialized = JSON.stringify(mapped.body);
    for (const privateField of [
      "Private asset",
      "normalizedValue",
      "creatorId",
      "token_hash",
      machineToken,
    ])
      expect(serialized).not.toContain(privateField);
    denied(
      await post("/asset/list", { tenantId: 1 }, machineToken),
      TenantError.HUMAN_REQUIRED
    );
    denied(
      await post("/tenant/list", {}, machineToken),
      TenantError.HUMAN_REQUIRED
    );
    const other = await post(
      "/asset/mapping/resolve",
      { tenantId: 2, ...source, observedTimeUtc },
      machineToken
    );
    denied(other, TenantError.NOT_VISIBLE);
    expect(
      await post(
        "/asset/mapping/resolve",
        { tenantId: 999, ...source, observedTimeUtc },
        machineToken
      )
    ).toEqual(other);
  });

  it("rechecks machine grants on a later authenticated HTTP request and rejects invalid credentials", async () => {
    const request = { tenantId: 1, ...source, observedTimeUtc };
    expect(
      (await post("/asset/mapping/resolve", request, machineToken)).body.ok
    ).toBe(true);
    await db
      .update(tenantApiTokenGrantTable)
      .set({ isEnabled: false })
      .where(eq(tenantApiTokenGrantTable.tokenId, 10));
    denied(
      await post("/asset/mapping/resolve", request, machineToken),
      TenantError.NOT_VISIBLE
    );
    denied(
      await post("/asset/list", { tenantId: 1 }, "invalid-synthetic-token"),
      BusinessErrorCode.NOT_AUTHENTICATED,
      401
    );
  });
});
