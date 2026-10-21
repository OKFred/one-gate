import { createClient, type Client } from "@libsql/client";
import { mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  migrateRoleSoftDelete,
  RoleSoftDeletePreflightError,
  roleSoftDeleteMigrationSql,
} from "../scripts/migrate-role-soft-delete";
import {
  invalidRoleMigrationFixtures,
  legacyRoleMigrationSql,
} from "../test/fixtures/role-migration";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import preflightSql from "../d1-contract/role-soft-delete-preflight.sql?raw";
import db from "@hodor/core/db/index";
import { prepareSuperAdminRole } from "@hodor/core/db/initUserAndRole";
import type { BatchItem } from "drizzle-orm/batch";

const clients: Client[] = [];
const directories: string[] = [];
async function legacyClient(): Promise<Client> {
  const directory = mkdtempSync(join(tmpdir(), "role-migration-test-"));
  directories.push(directory);
  const client = createClient({
    url: pathToFileURL(join(directory, "test.db")).href,
  });
  clients.push(client);
  await client.executeMultiple(legacyRoleMigrationSql);
  return client;
}
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
  for (const directory of directories.splice(0)) {
    try {
      for (const name of ["test.db", "test.db-wal", "test.db-shm"])
        rmSync(join(directory, name), { force: true });
      rmdirSync(directory);
    } catch (error) {
      // libSQL's native transaction handle may remain open until process exit on Windows.
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "EPERM"
      )
        throw error;
    }
  }
});

describe("one-off role soft-delete migration on file SQLite", () => {
  it("keeps the read-only D1 summary identical to the enforced migration preflight", () => {
    expect(
      preflightSql
        .replace(/^--[^\n]*\n/, "")
        .trim()
        .replace(/;$/, "")
    ).toBe(
      roleSoftDeleteMigrationSql.match(
        /-- role-soft-delete-preflight-start\s*([\s\S]*?)\s*-- role-soft-delete-preflight-end/
      )?.[1]
    );
  });
  it("preserves all old columns, IDs, permission bindings and sequence high water", async () => {
    const client = await legacyClient();
    expect(await migrateRoleSoftDelete(client)).toBe("applied");
    expect(
      (await client.execute("SELECT * FROM system_role WHERE id=2")).rows[0]
    ).toEqual({
      id: 2,
      name: "Keep",
      remark: "original",
      is_enabled: 0,
      permission_count: 1,
      data_scope: "custom",
      custom_dept_ids: "[7]",
      creator_id: 7,
      updater_id: 8,
      create_time_utc: 100,
      update_time_utc: 101,
      is_deleted: 0,
      deleted_time_utc: null,
      deleter_id: null,
    });
    expect(
      (await client.execute("SELECT * FROM system_role_permission")).rows
    ).toEqual([
      {
        id: 30,
        role_id: 2,
        permission_id: 20,
        creator_id: 7,
        updater_id: 8,
        create_time_utc: 100,
        update_time_utc: 101,
      },
    ]);
    expect(
      (
        await client.execute(
          "SELECT seq FROM sqlite_sequence WHERE name='system_role'"
        )
      ).rows[0].seq
    ).toBe(900);
    await client.execute(
      "UPDATE system_role SET is_deleted=1,deleted_time_utc=200,deleter_id=7 WHERE id=2"
    );
    const inserted = await client.execute(
      "INSERT INTO system_role (name,is_enabled,permission_count,data_scope,creator_id,is_deleted) VALUES ('Keep',1,0,'all',1,0) RETURNING id"
    );
    expect(Number(inserted.rows[0].id)).toBeGreaterThan(900);
    await expect(
      client.execute(
        "UPDATE system_role SET is_deleted=0,deleted_time_utc=NULL,deleter_id=NULL WHERE id=2"
      )
    ).rejects.toThrow();
    expect(await migrateRoleSoftDelete(client)).toBe("already_applied");
    expect(
      (
        await client.execute(
          "SELECT deleted_time_utc FROM system_role WHERE id=2"
        )
      ).rows[0].deleted_time_utc
    ).toBe(200);
    expect(
      (
        await client.execute(
          "SELECT COUNT(*) AS total FROM _node_server_migrations"
        )
      ).rows[0].total
    ).toBe(1);
  });

  it("requires explicit deletion state without new defaults and rejects inconsistent states", async () => {
    const client = await legacyClient();
    await migrateRoleSoftDelete(client);
    const columns = (await client.execute("PRAGMA table_info(system_role)"))
      .rows;
    for (const name of ["is_deleted", "deleted_time_utc", "deleter_id"])
      expect(
        columns.find((column) => column.name === name)?.dflt_value
      ).toBeNull();
    await expect(
      client.execute(
        "INSERT INTO system_role (name,is_enabled,permission_count,data_scope,creator_id) VALUES ('Missing',1,0,'all',1)"
      )
    ).rejects.toThrow();
    for (const mutation of [
      "is_deleted=1",
      "is_deleted=2",
      "deleter_id=1",
      "deleted_time_utc=200",
    ])
      await expect(
        client.execute(`UPDATE system_role SET ${mutation} WHERE id=2`)
      ).rejects.toThrow();
  });

  it.each(invalidRoleMigrationFixtures)(
    "blocks $issue and leaves the old schema/data unchanged",
    async ({ sql, issue }) => {
      const client = await legacyClient();
      await client.execute(sql);
      expect((await client.execute(preflightSql)).rows[0][issue]).toBe(1);
      const before = await client.execute("SELECT * FROM system_role");
      const bindings = await client.execute(
        "SELECT * FROM system_role_permission"
      );
      await expect(migrateRoleSoftDelete(client)).rejects.toMatchObject({
        name: "RoleSoftDeletePreflightError",
        summary: { [issue]: 1 },
      });
      expect(
        (await client.execute("PRAGMA table_info(system_role)")).rows.map(
          (row) => row.name
        )
      ).not.toContain("is_deleted");
      expect((await client.execute("SELECT * FROM system_role")).rows).toEqual(
        before.rows
      );
      expect(
        (await client.execute("SELECT * FROM system_role_permission")).rows
      ).toEqual(bindings.rows);
      expect(
        (
          await client.execute(
            "SELECT name FROM sqlite_master WHERE name LIKE '_role_soft_delete_%' OR name='_node_server_migrations'"
          )
        ).rows
      ).toHaveLength(0);
    }
  );

  it("reports only safe issue counts for preflight failures", async () => {
    const client = await legacyClient();
    await client.execute(
      "UPDATE system_user SET role_id_arr='private-invalid-fixture'"
    );
    try {
      await migrateRoleSoftDelete(client);
      throw new Error("Migration unexpectedly succeeded");
    } catch (error) {
      expect(error).toBeInstanceOf(RoleSoftDeletePreflightError);
      if (error instanceof RoleSoftDeletePreflightError)
        expect(error.message).toBe(
          'Role migration preflight failed: {"user_role_arrays":1}'
        );
    }
  });

  it("rolls back a late index failure, including schema, data, high water and marker", async () => {
    const client = await legacyClient();
    await client.execute("CREATE TABLE conflicting_index_owner (id INTEGER)");
    await client.execute(
      "CREATE INDEX system_role_deleted_time_idx ON conflicting_index_owner(id)"
    );
    await expect(migrateRoleSoftDelete(client)).rejects.toThrow();
    expect(
      (await client.execute("PRAGMA table_info(system_role)")).rows.map(
        (row) => row.name
      )
    ).not.toContain("is_deleted");
    expect(
      (await client.execute("SELECT name,remark FROM system_role WHERE id=2"))
        .rows[0]
    ).toEqual({ name: "Keep", remark: "original" });
    expect(
      (
        await client.execute(
          "SELECT seq FROM sqlite_sequence WHERE name='system_role'"
        )
      ).rows[0].seq
    ).toBe(900);
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE name IN ('__new_system_role','_role_soft_delete_sequence','_node_server_migrations')"
        )
      ).rows
    ).toHaveLength(0);
    expect(
      (
        await client.execute(
          "SELECT role_id FROM system_role_permission WHERE id=30"
        )
      ).rows[0].role_id
    ).toBe(2);
  });

  it("refuses a changed checksum or a pre-upgraded schema missing its marker", async () => {
    const client = await legacyClient();
    await migrateRoleSoftDelete(client);
    await client.execute(
      "UPDATE _node_server_migrations SET checksum='changed' WHERE id='0015_role_soft_delete'"
    );
    await expect(migrateRoleSoftDelete(client)).rejects.toThrow(
      "checksum mismatch"
    );
    await client.execute("DELETE FROM _node_server_migrations");
    await expect(migrateRoleSoftDelete(client)).rejects.toThrow(
      "without a migration marker"
    );
    expect(
      (await client.execute("SELECT COUNT(*) AS total FROM system_role"))
        .rows[0].total
    ).toBe(2);
  });

  it("preserves sequence for an empty previously populated table", async () => {
    const client = await legacyClient();
    await client.executeMultiple(
      "DELETE FROM system_user; DELETE FROM system_role_permission; DELETE FROM system_role;"
    );
    await migrateRoleSoftDelete(client);
    const inserted = await client.execute(
      "INSERT INTO system_role (name,is_enabled,permission_count,data_scope,creator_id,is_deleted) VALUES ('First',1,0,'all',1,0) RETURNING id"
    );
    expect(Number(inserted.rows[0].id)).toBeGreaterThan(900);
  });

  it("initializes a fresh schema and synchronizes the protected role with explicit state", async () => {
    await db.run("DROP TABLE IF EXISTS system_role");
    for (const statement of roleSql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean))
      await db.run(statement);
    const first = await prepareSuperAdminRole();
    await db.batch(
      first.queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]
    );
    expect(
      await db.get(
        "SELECT id,is_deleted,deleted_time_utc,deleter_id FROM system_role WHERE id=1"
      )
    ).toMatchObject({
      id: 1,
      is_deleted: 0,
      deleted_time_utc: null,
      deleter_id: null,
    });
    await db.run(
      "UPDATE system_role SET is_deleted=1,deleted_time_utc=200,deleter_id=7 WHERE id=1"
    );
    const sync = await prepareSuperAdminRole();
    await db.batch(
      sync.queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]
    );
    expect(
      await db.get(
        "SELECT is_deleted,deleted_time_utc,deleter_id FROM system_role WHERE id=1"
      )
    ).toMatchObject({
      is_deleted: 0,
      deleted_time_utc: null,
      deleter_id: null,
    });
  });
});
