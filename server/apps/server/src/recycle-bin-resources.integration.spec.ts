import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { sql } from "drizzle-orm";
import db from "@hodor/core/db/index.js";
import { clearTestData, setupTestDb } from "@hodor/core/db/testHelper.js";
import { recycleBinRegistry as coreRegistry } from "@hodor/core/db/recycle-bin.js";
import { SOFT_DELETE_RETENTION_MS } from "@hodor/core/db/soft-delete.js";
import { departmentRecycleBinAdapter } from "@hodor/admin/system/department/facade.js";
import { roleRecycleBinAdapter } from "@hodor/admin/system/role/facade.js";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import departmentSql from "@hodor/core/db/sql/admin/system_department.sql?raw";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import complianceSql from "@hodor/core/db/sql/admin/compliance_archives.sql?raw";
import { recycleBinRegistry } from "./recycle-bin-resources.js";
import { runRetentionMaintenance } from "./soft-delete-cleanup.js";
import createApp from "./index.js";

describe("production recycle-bin composition", () => {
  const now = 2_000_000_000_000;
  const cutoff = now - SOFT_DELETE_RETENTION_MS;

  beforeAll(async () => {
    await setupTestDb(db, [
      departmentSql,
      userSql,
      roleSql,
      rolePermissionSql,
      complianceSql,
    ]);
  });

  beforeEach(async () => {
    await clearTestData(db, [
      "system_department",
      "system_user",
      "system_role_permission",
      "system_role",
      "compliance_archives",
    ]);
    vi.spyOn(Date, "now").mockReturnValue(now);
  });

  afterEach(() => vi.restoreAllMocks());

  it("shares the core catalog and tolerates repeated application construction", () => {
    expect(recycleBinRegistry).toBe(coreRegistry);
    expect(recycleBinRegistry.list()).toEqual([
      departmentRecycleBinAdapter,
      roleRecycleBinAdapter,
    ]);
    const options = {
      resolveTotpGateCenter: () => {
        throw new Error("Authentication is outside this construction test");
      },
    };
    createApp(options);
    createApp(options);
    expect(recycleBinRegistry.list()).toEqual([
      departmentRecycleBinAdapter,
      roleRecycleBinAdapter,
    ]);
  });

  it("cleans registered departments and legacy archives in batches while retaining unexpired and unrelated records", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await db.run(sql`WITH RECURSIVE entries(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM entries WHERE n<101)
      INSERT INTO system_department (name,is_enabled,creator_id,is_deleted,deleted_time_utc,deleter_id)
      SELECT 'expired-' || n,1,1,1,${cutoff},1 FROM entries`);
    await db.run(sql`INSERT INTO system_department (name,is_enabled,creator_id,is_deleted,deleted_time_utc,deleter_id)
      VALUES ('active',1,1,0,NULL,NULL),('recent',1,1,1,${cutoff + 1},1)`);
    await db.run(sql`WITH RECURSIVE entries(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM entries WHERE n<101)
      INSERT INTO compliance_archives (source_system,source_database,source_table,source_primary_key,record_snapshot,restorable,creator_id,create_time_utc)
      SELECT 'self','self','system_department',CAST(n AS TEXT),'{}',1,1,${cutoff} FROM entries`);
    await db.run(sql`INSERT INTO compliance_archives (source_system,source_database,source_table,source_primary_key,record_snapshot,restorable,creator_id,create_time_utc)
      VALUES ('self','self','system_department','recent','{}',1,1,${cutoff + 1}),('self','self','system_user','other','{}',1,1,${cutoff})`);

    await db.run(sql`WITH RECURSIVE entries(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM entries WHERE n<101)
      INSERT INTO system_role (id,name,is_enabled,permission_count,data_scope,creator_id,is_deleted,deleted_time_utc,deleter_id)
      SELECT 10+n,'expired-role-' || n,1,1,'all',1,1,${cutoff},1 FROM entries`);
    await db.run(
      sql`INSERT INTO system_role_permission (role_id,permission_id,creator_id) SELECT id,1,1 FROM system_role`
    );
    await runRetentionMaintenance();
    expect(
      await db.all(sql`SELECT COUNT(*) AS total FROM system_role`)
    ).toEqual([{ total: 1 }]);
    expect(
      await db.all(sql`SELECT COUNT(*) AS total FROM system_role_permission`)
    ).toEqual([{ total: 1 }]);
    for (const module of ["department", "role", "legacy_department_archive"]) {
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "soft_delete_cleanup",
          module,
          deletedCount: 100,
          remainingExpired: 1,
          oldestExpiredTimeUtc: now,
          checkedTimeUtc: now,
          cutoffTimeUtc: cutoff,
          overdueMs: 0,
        })
      );
    }
    expect(
      await db.all(sql`SELECT count(*) AS total FROM system_department`)
    ).toEqual([{ total: 3 }]);
    expect(
      await db.all(sql`SELECT count(*) AS total FROM compliance_archives`)
    ).toEqual([{ total: 3 }]);

    await runRetentionMaintenance();
    expect(
      await db.all(sql`SELECT name FROM system_department ORDER BY name`)
    ).toEqual([{ name: "active" }, { name: "recent" }]);
    expect(
      await db.all(
        sql`SELECT source_primary_key AS id FROM compliance_archives ORDER BY source_primary_key`
      )
    ).toEqual([{ id: "other" }, { id: "recent" }]);
    info.mockClear();
    warn.mockClear();
    await runRetentionMaintenance();
    expect(info).toHaveBeenCalledTimes(3);
    expect(await db.all(sql`SELECT id FROM system_role_permission`)).toEqual(
      []
    );
    for (const module of ["department", "role", "legacy_department_archive"]) {
      expect(info).toHaveBeenCalledWith({
        event: "soft_delete_cleanup",
        module,
        checkedTimeUtc: now,
        cutoffTimeUtc: cutoff,
        deletedCount: 0,
        remainingExpired: 0,
        oldestExpiredTimeUtc: null,
        overdueMs: 0,
        durationMs: 0,
      });
    }
    expect(warn).not.toHaveBeenCalled();
  });
});
