import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import tokenSql from "@hodor/core/db/sql/admin/system_api_token.sql?raw";
import { userTable } from "../user/model";
import { roleTable } from "../role/model";
import { apiTokenTable } from "../api-token/model";
import { systemAccess } from "../access-metadata";

const permission = "enterprise.asset.mapping:read";
const allowed = async (
  condition: ReturnType<typeof systemAccess.userActiveSql>
) =>
  (
    await db.all<{ allowed: number }>(
      sql`SELECT CASE WHEN ${condition} THEN 1 ELSE 0 END AS allowed`
    )
  )[0]?.allowed === 1;

describe("public access metadata and current database guards", () => {
  beforeAll(() => setupTestDb(db, [userSql, roleSql, tokenSql]));
  beforeEach(async () => {
    await clearTestData(db, ["system_api_token", "system_user", "system_role"]);
    await db.insert(userTable).values({
      id: 10,
      username: "access-fixture",
      password: "unused-synthetic-hash",
      langCode: "en-US",
      roleIdArr: [1],
      isEnabled: true,
      creatorId: 10,
    });
    await db.insert(roleTable).values({
      id: 1,
      name: "access-admin",
      isEnabled: true,
      permissionCount: 0,
      dataScope: "all",
      creatorId: 10,
      isDeleted: false,
      deletedTimeUtc: null,
      deleterId: null,
    });
    await db.insert(apiTokenTable).values({
      id: 30,
      name: "mapping-only",
      tokenPrefix: "fixture",
      tokenHash: "synthetic-unusable-hash",
      permissions: JSON.stringify([permission]),
      status: "active",
      creatorId: 10,
      startTimeUtc: null,
      expireTimeUtc: null,
    });
  });

  it("returns only public metadata and never password, hash or raw credential material", async () => {
    expect(await systemAccess.getUserMetadata(10)).toEqual({
      id: 10,
      username: "access-fixture",
      isEnabled: true,
    });
    expect(await systemAccess.getApiTokenMetadata(30)).toEqual({
      id: 30,
      creatorId: 10,
      status: "active",
      startTimeUtc: null,
      expireTimeUtc: null,
      permissions: JSON.stringify([permission]),
    });
    expect(await systemAccess.getUserMetadata(404)).toBeNull();
    expect(await systemAccess.getApiTokenMetadata(404)).toBeNull();
  });

  it("rechecks current user and super-admin role instead of trusting a prior principal", async () => {
    expect(await allowed(systemAccess.platformAdminSql(10))).toBe(true);
    await db
      .update(userTable)
      .set({ roleIdArr: [] })
      .where(eq(userTable.id, 10));
    expect(await allowed(systemAccess.platformAdminSql(10))).toBe(false);
    await db
      .update(userTable)
      .set({ roleIdArr: [1] })
      .where(eq(userTable.id, 10));
    await db
      .update(roleTable)
      .set({ isEnabled: false })
      .where(eq(roleTable.id, 1));
    expect(await allowed(systemAccess.platformAdminSql(10))).toBe(false);
    await db
      .update(roleTable)
      .set({ isEnabled: true })
      .where(eq(roleTable.id, 1));
    await db
      .update(userTable)
      .set({ isEnabled: false })
      .where(eq(userTable.id, 10));
    expect(await allowed(systemAccess.userActiveSql(10))).toBe(false);
    expect(await allowed(systemAccess.platformAdminSql(10))).toBe(false);
  });

  it("fails closed for malformed or incorrectly typed role arrays", async () => {
    for (const raw of ["not-json", '"1"', '["1"]', '{"role":1}']) {
      await db.run(
        sql`UPDATE system_user SET role_id_arr = ${raw} WHERE id = 10`
      );
      expect(await allowed(systemAccess.platformAdminSql(10))).toBe(false);
    }
  });

  it("keeps token identity and management ownership separate", async () => {
    expect(await allowed(systemAccess.tokenOwnedBySql(30, 10))).toBe(true);
    expect(await allowed(systemAccess.tokenOwnedBySql(30, 31))).toBe(false);
    expect(await allowed(systemAccess.tokenUsableSql(30, permission))).toBe(
      true
    );
    expect(
      await allowed(systemAccess.tokenUsableSql(30, "enterprise.asset:edit"))
    ).toBe(false);
  });

  it("rejects revoked, expired and future tokens in final SQL", async () => {
    await db
      .update(apiTokenTable)
      .set({ status: "revoked" })
      .where(eq(apiTokenTable.id, 30));
    expect(await allowed(systemAccess.tokenUsableSql(30, permission))).toBe(
      false
    );
    await db
      .update(apiTokenTable)
      .set({ status: "active", expireTimeUtc: Date.now() - 1 })
      .where(eq(apiTokenTable.id, 30));
    expect(await allowed(systemAccess.tokenUsableSql(30, permission))).toBe(
      false
    );
    await db
      .update(apiTokenTable)
      .set({ expireTimeUtc: null, startTimeUtc: Date.now() + 60_000 })
      .where(eq(apiTokenTable.id, 30));
    expect(await allowed(systemAccess.tokenUsableSql(30, permission))).toBe(
      false
    );
  });

  it("does not treat malformed token permissions as an empty or unrestricted capability", async () => {
    for (const raw of ["not-json", '"enterprise.asset.mapping:read"', "[1]"]) {
      await db
        .update(apiTokenTable)
        .set({ permissions: raw })
        .where(eq(apiTokenTable.id, 30));
      expect(await allowed(systemAccess.tokenUsableSql(30, permission))).toBe(
        false
      );
    }
  });
});
