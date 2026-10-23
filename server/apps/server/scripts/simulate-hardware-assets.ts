/** Loopback-only, in-memory API fixture for the collector's A -> B simulation. */
import { randomBytes, createHash } from "node:crypto";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq, sql } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { setupTestDb } from "@hodor/core/db/testHelper";
import { setEnv } from "@hodor/core/utils/env";
import { tokenUtils } from "@hodor/core/utils/token";
import errorHandler from "@hodor/core/middleware/errorHandler";
import type { AppBindings } from "@hodor/core/types/app";
import { initAdminRegistry } from "@hodor/admin/register";
import { userTable } from "@hodor/admin/system/user/model";
import { roleTable } from "@hodor/admin/system/role/model";
import { permissionTable } from "@hodor/admin/system/permission/model";
import { rolePermissionTable } from "@hodor/admin/system/role_permission/model";
import createAssetApp from "@hodor/enterprise/asset/index";
import {
  assetTable,
  assetAssignmentTable,
} from "@hodor/enterprise/asset/model";
import {
  tenantTable,
  tenantMemberTable,
  tenantApiTokenGrantTable,
} from "@hodor/enterprise/tenant/model";

const controlFile = process.argv[2];
if (!controlFile || !path.isAbsolute(controlFile))
  throw new Error(
    "Pass an absolute private control-file path outside the repository"
  );
const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");
const relativeControl = path.relative(repositoryRoot, controlFile);
if (
  !relativeControl.startsWith(`..${path.sep}`) &&
  !path.isAbsolute(relativeControl)
)
  throw new Error("The fixture control file must stay outside the repository");

setEnv({
  DB_FILE_NAME: "",
  DATABASE_BACKEND: "sqlite",
  JWT_SECRET: randomBytes(32).toString("hex"),
  BASE_API_PATH: "/api/v1",
  LOCALE: "en-US",
  NODE_ENV: "test",
});
initAdminRegistry();
const ddlRoot = new URL("../../../packages/core/src/db/sql/", import.meta.url);
const ddlFiles = [
  "admin/system_user.sql",
  "admin/system_role.sql",
  "admin/system_permission.sql",
  "admin/system_role_permission.sql",
  "admin/system_api_token.sql",
  "admin/i18n_translation.sql",
  "enterprise/enterprise_tenant.sql",
  "enterprise/enterprise_tenant_member.sql",
  "enterprise/enterprise_tenant_api_token_grant.sql",
  "enterprise/enterprise_asset.sql",
  "enterprise/enterprise_asset_identifier.sql",
  "enterprise/enterprise_asset_assignment.sql",
  "enterprise/enterprise_asset_measurement_binding.sql",
];
await setupTestDb(
  db,
  await Promise.all(
    ddlFiles.map((file) => readFile(new URL(file, ddlRoot), "utf8"))
  )
);
const createdTime = Date.now();
const permissions = [
  "enterprise.asset:read",
  "enterprise.asset:add",
  "enterprise.asset:edit",
  "enterprise.asset.mapping:read",
  "enterprise.asset.telemetry:read",
];
await db.insert(roleTable).values({
  id: 10,
  name: "synthetic-asset-owner",
  isEnabled: true,
  isDeleted: false,
  deletedTimeUtc: null,
  deleterId: null,
  dataScope: "self_only",
  customDeptIds: null,
  permissionCount: permissions.length,
  creatorId: 101,
  createTimeUtc: createdTime,
  updateTimeUtc: null,
});
await db.insert(userTable).values({
  id: 101,
  username: "synthetic-owner",
  password: "synthetic-unused-hash",
  langCode: "en-US",
  isEnabled: true,
  roleIdArr: [10],
  creatorId: 101,
  createTimeUtc: createdTime,
});
for (const [index, code] of permissions.entries()) {
  await db.insert(permissionTable).values({
    id: index + 1,
    code,
    name: code,
    category: "action",
    business: code.split(":")[0],
    resource: null,
    remark: null,
    isEnabled: true,
    creatorId: 101,
    createTimeUtc: createdTime,
  });
  await db
    .insert(rolePermissionTable)
    .values({ roleId: 10, permissionId: index + 1, creatorId: 101 });
}
await db.insert(tenantTable).values({
  id: 1,
  key: "synthetic-hardware",
  name: "Synthetic hardware simulation",
  isEnabled: true,
  recoveryReason: null,
  creatorId: 101,
  updaterId: null,
  createTimeUtc: createdTime,
  updateTimeUtc: createdTime,
});
await db.insert(tenantMemberTable).values({
  tenantId: 1,
  userId: 101,
  role: "owner",
  isEnabled: true,
  creatorId: 101,
  updaterId: null,
  createTimeUtc: createdTime,
  updateTimeUtc: createdTime,
});
const catalogToken = `hdr_synthetic_${randomBytes(24).toString("hex")}`;
await db.run(sql`INSERT INTO system_api_token
  (id,name,token_prefix,token_hash,permissions,status,creator_id,create_time_utc)
  VALUES (10,'Synthetic telemetry','hdr_synthetic',${createHash("sha256").update(catalogToken).digest("hex")},
  ${JSON.stringify(["enterprise.asset.mapping:read", "enterprise.asset.telemetry:read"])},'active',101,${createdTime})`);
await db.insert(tenantApiTokenGrantTable).values({
  tenantId: 1,
  tokenId: 10,
  isEnabled: true,
  creatorId: 101,
  updaterId: null,
  createTimeUtc: createdTime,
  updateTimeUtc: createdTime,
});
const app = new OpenAPIHono<AppBindings>();
app.route("/api/v1/enterprise/asset", createAssetApp());
errorHandler(app);
const adminToken = tokenUtils.generateToken({
  userId: 101,
  username: "synthetic-owner",
});

async function post(route: string, body: object): Promise<unknown> {
  const response = await app.request(
    `http://localhost/api/v1/enterprise/asset/${route}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(body),
    }
  );
  const envelope: unknown = await response.json();
  if (
    !response.ok ||
    !envelope ||
    typeof envelope !== "object" ||
    !("ok" in envelope) ||
    envelope.ok !== true ||
    !("data" in envelope)
  )
    throw new Error(`Synthetic fixture API ${route} was rejected`);
  return envelope.data;
}
async function createAsset(
  name: string,
  category: "host" | "disk",
  model: string | null = null
) {
  const id = await post("add", { tenantId: 1, name, category, model });
  if (typeof id !== "number") throw new Error("Unexpected synthetic asset ID");
  const [asset] = await db
    .select()
    .from(assetTable)
    .where(eq(assetTable.id, id));
  if (!asset) throw new Error("Synthetic asset creation was not persisted");
  return asset;
}
async function assetVersion(id: number) {
  const [asset] = await db
    .select()
    .from(assetTable)
    .where(eq(assetTable.id, id));
  if (!asset) throw new Error("Synthetic asset missing");
  return asset.updateTimeUtc;
}
const hostA = await createAsset("Synthetic host A", "host");
const hostB = await createAsset("Synthetic host B", "host");
const diskD = await createAsset("Synthetic disk D", "disk", "SIMULATED-DISK");
const diskE = await createAsset("Synthetic disk E", "disk", "SIMULATED-DISK");
for (const [asset, value] of [
  [diskD, "5000000000000001"],
  [diskE, "5000000000000002"],
] as const) {
  await post("identifierAdd", {
    tenantId: 1,
    assetId: asset.id,
    expectedAssetUpdateTimeUtc: await assetVersion(asset.id),
    identifierType: "wwn",
    namespace: "storage.wwn",
    value,
    source: "synthetic-fixture",
    confidence: "high",
    isVerified: true,
  });
}
const startTimeUtc = Date.now();
for (const disk of [diskD, diskE]) {
  await post("assign", {
    tenantId: 1,
    assetId: disk.id,
    expectedAssetUpdateTimeUtc: await assetVersion(disk.id),
    hostAssetId: hostA.id,
    location: "Synthetic rack",
    validFromUtc: startTimeUtc,
    reason: "Synthetic initial installation",
  });
}
const assignments = await db.select().from(assetAssignmentTable);
const initialD = assignments.find(
  (assignment) => assignment.assetId === diskD.id
);
const initialE = assignments.find(
  (assignment) => assignment.assetId === diskE.id
);
if (!initialD || !initialE)
  throw new Error("Synthetic initial assignments missing");
const moveTimeUtc = Math.max(Date.now(), startTimeUtc + 1000);
const tasks = new Set<Promise<unknown>>();
const server = serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch: (request) =>
    app.fetch(
      request,
      {},
      {
        waitUntil(task) {
          tasks.add(task);
          void task.finally(() => tasks.delete(task)).catch(() => undefined);
        },
        passThroughOnException() {},
        props: {},
      }
    ),
});
let closing = false;
let controlPublished = false;
async function close() {
  if (closing) return;
  closing = true;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await Promise.allSettled([...tasks]);
  if (controlPublished) {
    try {
      await unlink(controlFile);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw error;
    }
  }
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void close().then(() => process.exit(0));
  });
}
try {
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Loopback fixture failed to bind");
  const control = {
    contractVersion: 1,
    baseUrl: `http://127.0.0.1:${address.port}/api/v1`,
    tenantId: 1,
    catalogToken,
    adminToken,
    hosts: {
      a: { id: hostA.id, assetId: hostA.assetId },
      b: { id: hostB.id, assetId: hostB.assetId },
    },
    disks: {
      d: {
        id: diskD.id,
        assetId: diskD.assetId,
        wwn: "5000000000000001",
        model: diskD.model,
      },
      e: {
        id: diskE.id,
        assetId: diskE.assetId,
        wwn: "5000000000000002",
        model: diskE.model,
      },
    },
    timeline: { startTimeUtc, moveTimeUtc },
    moveRequest: {
      tenantId: 1,
      assetId: diskD.id,
      expectedAssetUpdateTimeUtc: await assetVersion(diskD.id),
      hostAssetId: hostB.id,
      location: "Synthetic rack B",
      validFromUtc: moveTimeUtc,
      reason: "Synthetic A to B migration",
      replacesId: initialD.id,
      expectedUpdateTimeUtc: initialD.updateTimeUtc,
    },
    initialAssignments: { d: initialD.id, e: initialE.id },
  };
  await writeFile(controlFile, `${JSON.stringify(control, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  controlPublished = true;
  console.log(
    JSON.stringify({
      event: "synthetic_hardware_fixture.ready",
      baseUrl: control.baseUrl,
      controlFile,
      persistentData: false,
    })
  );
} catch {
  await close();
  console.error(
    JSON.stringify({
      event: "synthetic_hardware_fixture.initialization_failed",
    })
  );
  process.exit(1);
}
