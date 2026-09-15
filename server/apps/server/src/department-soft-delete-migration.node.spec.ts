import { createClient, type Client } from "@libsql/client";
import { mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { migrateDepartmentSoftDelete } from "../scripts/migrate-department-soft-delete";
import menuSql from "@hodor/core/db/sql/admin/system_menu.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import translationSql from "@hodor/core/db/sql/admin/i18n_translation.sql?raw";

const clients: Client[] = [];
const directories: string[] = [];
const legacySql = `
CREATE TABLE system_department (
 id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL,
 parent_id INTEGER, remark TEXT, is_enabled INTEGER NOT NULL,
 creator_id INTEGER NOT NULL, updater_id INTEGER,
 create_time_utc INTEGER NOT NULL, update_time_utc INTEGER
);
CREATE UNIQUE INDEX system_department_name_unique ON system_department(name);
CREATE TABLE compliance_archives (
 id INTEGER PRIMARY KEY AUTOINCREMENT, source_system TEXT,
 source_database TEXT, source_table TEXT, create_time_utc INTEGER
);
INSERT INTO system_department VALUES (1,'Keep',NULL,'original',1,7,8,100,101);
INSERT INTO system_department VALUES (900,'Removed',NULL,NULL,0,7,NULL,100,NULL);
DELETE FROM system_department WHERE id=900;
`;
async function legacyClient() {
  const directory = mkdtempSync(join(tmpdir(), "department-migration-test-"));
  directories.push(directory);
  const client = createClient({
    url: pathToFileURL(join(directory, "test.db")).href,
  });
  clients.push(client);
  await client.executeMultiple(legacySql);
  return client;
}
async function prepareMetadata(client: Client) {
  await client.executeMultiple(
    [menuSql, roleSql, permissionSql, rolePermissionSql, translationSql].join(
      "\n"
    )
  );
  await client.execute(
    "INSERT INTO system_role (id,name,is_enabled,permission_count,data_scope,creator_id) VALUES (1,'Superadmin',1,0,'ALL',1),(2,'Ordinary',1,0,'ALL',1)"
  );
}
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
  for (const directory of directories.splice(0)) {
    try {
      for (const name of ["test.db", "test.db-wal", "test.db-shm"])
        rmSync(join(directory, name), { force: true });
      rmdirSync(directory);
    } catch (error) {
      // libSQL 0.15 retains the transaction's native handle until process exit on Windows.
      // These isolated, synthetic fixtures remain in the OS temporary directory in that case.
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "EPERM"
      )
        throw error;
    }
  }
});

describe("one-off department soft-delete migration", () => {
  it("defaults to schema and metadata together, assigning actions only to role 1", async () => {
    const client = await legacyClient();
    await prepareMetadata(client);
    expect(await migrateDepartmentSoftDelete(client)).toBe("applied");
    expect(
      (
        await client.execute(
          "SELECT name,is_deleted FROM system_department WHERE id=1"
        )
      ).rows[0]
    ).toMatchObject({ name: "Keep", is_deleted: 0 });
    expect(
      (
        await client.execute(
          "SELECT path FROM system_menu WHERE business='admin.maintenance.recycle_bin'"
        )
      ).rows[0].path
    ).toBe("/admin/recycle-bin");
    expect(
      (
        await client.execute(
          "SELECT role_id FROM system_role_permission rp JOIN system_permission p ON p.id=rp.permission_id WHERE p.business='admin.maintenance.recycle_bin'"
        )
      ).rows
    ).toEqual([{ role_id: 1 }, { role_id: 1 }, { role_id: 1 }]);
    expect(
      (
        await client.execute(
          "SELECT COUNT(*) AS total FROM i18n_translation WHERE t_key='errorHandler.department.nameConflict'"
        )
      ).rows[0].total
    ).toBe(2);
    expect(
      (
        await client.execute(
          "SELECT COUNT(*) AS total FROM _node_server_migrations"
        )
      ).rows[0].total
    ).toBe(2);
    expect(await migrateDepartmentSoftDelete(client)).toBe("already_applied");
  });

  it("rolls back the schema too when an unrelated menu occupies the reserved ID", async () => {
    const client = await legacyClient();
    await prepareMetadata(client);
    await client.execute(
      "INSERT INTO system_menu (id,name,icon,sort,business,is_enabled,creator_id) VALUES (107,'Unrelated','folder',1,'unrelated',1,1)"
    );
    await expect(migrateDepartmentSoftDelete(client)).rejects.toThrow();
    expect(
      (await client.execute("PRAGMA table_info(system_department)")).rows.map(
        (row) => row.name
      )
    ).not.toContain("is_deleted");
    expect(
      (await client.execute("SELECT business FROM system_menu WHERE id=107"))
        .rows[0].business
    ).toBe("unrelated");
  });

  it("preserves content, high-water ID, no-default constraints and repeat protection", async () => {
    const client = await legacyClient();
    expect(
      await migrateDepartmentSoftDelete(client, { schemaOnly: true })
    ).toBe("applied");
    const result = await client.execute("SELECT * FROM system_department");
    expect(result.rows).toMatchObject([
      {
        id: 1,
        name: "Keep",
        remark: "original",
        creator_id: 7,
        updater_id: 8,
        create_time_utc: 100,
        update_time_utc: 101,
        is_deleted: 0,
        deleted_time_utc: null,
        deleter_id: null,
      },
    ]);
    await expect(
      client.execute(
        "INSERT INTO system_department (name,is_enabled,creator_id) VALUES ('Missing flag',1,1)"
      )
    ).rejects.toThrow();
    await expect(
      client.execute("UPDATE system_department SET is_deleted=1 WHERE id=1")
    ).rejects.toThrow();
    await expect(
      client.execute("UPDATE system_department SET is_deleted=2 WHERE id=1")
    ).rejects.toThrow();
    await client.execute(
      "UPDATE system_department SET is_deleted=1,deleted_time_utc=200,deleter_id=7 WHERE id=1"
    );
    const inserted = await client.execute(
      "INSERT INTO system_department (name,is_enabled,creator_id,is_deleted) VALUES ('Keep',1,1,0) RETURNING id"
    );
    expect(Number(inserted.rows[0].id)).toBeGreaterThan(900);
    await expect(
      client.execute(
        "UPDATE system_department SET is_deleted=0,deleted_time_utc=NULL,deleter_id=NULL WHERE id=1"
      )
    ).rejects.toThrow();
    expect(
      await migrateDepartmentSoftDelete(client, { schemaOnly: true })
    ).toBe("already_applied");
    expect(
      (
        await client.execute(
          "SELECT is_deleted FROM system_department WHERE id=1"
        )
      ).rows[0].is_deleted
    ).toBe(1);
  });

  it("rolls the entire swap back when a later statement fails", async () => {
    const client = await legacyClient();
    await client.execute("DROP TABLE compliance_archives");
    await expect(
      migrateDepartmentSoftDelete(client, { schemaOnly: true })
    ).rejects.toThrow();
    const columns = await client.execute(
      "PRAGMA table_info(system_department)"
    );
    expect(columns.rows.map((row) => row.name)).not.toContain("is_deleted");
    expect(
      (await client.execute("SELECT name,remark FROM system_department")).rows
    ).toMatchObject([{ name: "Keep", remark: "original" }]);
    expect(
      (
        await client.execute(
          "SELECT seq FROM sqlite_sequence WHERE name='system_department'"
        )
      ).rows[0].seq
    ).toBe(900);
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE name IN ('__new_system_department','_department_soft_delete_sequence','_node_server_migrations')"
        )
      ).rows
    ).toHaveLength(0);
  });

  it("retains the sequence for a previously populated but empty department table", async () => {
    const client = await legacyClient();
    await client.execute("DELETE FROM system_department");
    await migrateDepartmentSoftDelete(client, { schemaOnly: true });
    const inserted = await client.execute(
      "INSERT INTO system_department (name,is_enabled,creator_id,is_deleted) VALUES ('First',1,1,0) RETURNING id"
    );
    expect(Number(inserted.rows[0].id)).toBeGreaterThan(900);
  });
});
