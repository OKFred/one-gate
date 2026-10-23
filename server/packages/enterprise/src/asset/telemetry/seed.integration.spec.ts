import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper";
import { preparePermissions } from "@hodor/core/db/initPermissions";
import { initialTranslationData } from "@hodor/core/db/initTranslation";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import { TELEMETRY_READ_PERMISSION } from "./context";

describe("asset telemetry permission seed and business translations", () => {
  beforeAll(() => setupTestDb(db, [permissionSql, rolePermissionSql]));
  beforeEach(() =>
    clearTestData(db, ["system_role_permission", "system_permission"])
  );

  async function syncPermissions() {
    const { queries } = await preparePermissions();
    for (const query of queries) await query;
  }

  it("seeds the dedicated permission idempotently and does not grant it to ordinary roles", async () => {
    await syncPermissions();
    await syncPermissions();
    const rows = await db.all<{
      code: string;
      business: string;
      is_enabled: number;
    }>(sql`SELECT code,business,is_enabled FROM system_permission
      WHERE code=${TELEMETRY_READ_PERMISSION}`);
    expect(rows).toEqual([
      {
        code: TELEMETRY_READ_PERMISSION,
        business: "enterprise.asset.telemetry",
        is_enabled: 1,
      },
    ]);
    const grants = await db.all<{ role_id: number }>(
      sql`SELECT binding.role_id FROM system_role_permission AS binding
        JOIN system_permission AS permission ON permission.id=binding.permission_id
        WHERE permission.code=${TELEMETRY_READ_PERMISSION}`
    );
    expect(grants.every((row) => row.role_id === 1)).toBe(true);
  });

  it.each([
    "errorHandler.enterprise.asset.telemetry.catalogTooLarge",
    "errorHandler.enterprise.asset.telemetry.invalidCatalog",
  ])("includes %s in both backend seed languages", (code) => {
    const translations = initialTranslationData.filter(
      (item) => item.tKey === code
    );
    expect(translations).toHaveLength(1);
    expect(translations[0]).toMatchObject({
      application: "backend",
      business: "enterprise.asset",
      isEnabled: true,
    });
    expect(translations[0]?.langCodes["zh-CN"]).toBeTruthy();
    expect(translations[0]?.langCodes["en-US"]).toBeTruthy();
  });
});
