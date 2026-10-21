import { createClient, type Client } from "@libsql/client";
import { mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  enterpriseAssetsContractSql,
  enterpriseAssetsMigrationSql,
  migrateEnterpriseAssets,
} from "../scripts/migrate-enterprise-assets";
import {
  existingBusinessSql,
  existingMetadataSql,
  invalidEnterpriseSchemas,
  tenantFixtureSql,
} from "../test/fixtures/enterprise-assets-migration";

const clients: Client[] = [];
const directories: string[] = [];
async function oldDatabase() {
  const directory = mkdtempSync(join(tmpdir(), "enterprise-assets-migration-"));
  directories.push(directory);
  const client = createClient({
    url: pathToFileURL(join(directory, "test.db")).href,
  });
  clients.push(client);
  await client.executeMultiple(existingBusinessSql);
  await client.executeMultiple(existingMetadataSql);
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
      // Native libSQL transaction handles can remain open until process exit on Windows.
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "EPERM"
      )
        throw error;
    }
  }
});

describe("enterprise asset migration on file SQLite", () => {
  it("adds seven tables atomically and preserves existing data and sequence", async () => {
    const client = await oldDatabase();
    expect(await migrateEnterpriseAssets(client)).toBe("applied");
    expect(
      (await client.execute("SELECT * FROM existing_business")).rows
    ).toEqual([{ id: 7, value: "unchanged" }]);
    expect(
      (
        await client.execute(
          "SELECT seq FROM sqlite_sequence WHERE name='existing_business'"
        )
      ).rows[0].seq
    ).toBe(900);
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'enterprise_%'"
        )
      ).rows
    ).toHaveLength(7);
    expect(
      (await client.execute("SELECT * FROM _node_server_migrations")).rows
    ).toHaveLength(1);
    expect(await migrateEnterpriseAssets(client)).toBe("already_applied");
    expect(
      (
        await client.execute(
          "SELECT name,path,business FROM system_menu WHERE id=107"
        )
      ).rows[0]
    ).toEqual({
      name: "Existing recycle bin",
      path: "/admin/recycle-bin",
      business: "admin.maintenance.recycle_bin",
    });
    expect(
      (
        await client.execute(
          "SELECT code FROM system_permission WHERE code LIKE 'enterprise.%'"
        )
      ).rows
    ).toHaveLength(7);
    expect(
      (await client.execute("SELECT role_id FROM system_role_permission")).rows
    ).toHaveLength(7);
    expect(
      (
        await client.execute(
          "SELECT role_id FROM system_role_permission WHERE role_id<>1"
        )
      ).rows
    ).toHaveLength(0);
  });
  it("rejects checksum drift even after a success marker", async () => {
    const client = await oldDatabase();
    await migrateEnterpriseAssets(client);
    await client.execute(
      "UPDATE _node_server_migrations SET checksum='changed'"
    );
    await expect(migrateEnterpriseAssets(client)).rejects.toThrow(
      "checksum mismatch"
    );
  });
  it("rechecks the read-only contract on repeat execution", async () => {
    const client = await oldDatabase();
    await migrateEnterpriseAssets(client);
    await client.execute("DROP INDEX enterprise_asset_public_id_unique");
    await expect(migrateEnterpriseAssets(client)).rejects.toThrow(
      "malformed JSON"
    );
  });
  it("rolls back a late index failure including its migration marker", async () => {
    const client = await oldDatabase();
    await client.execute(
      "CREATE INDEX enterprise_asset_tenant_status_idx ON existing_business(value)"
    );
    await expect(migrateEnterpriseAssets(client)).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE 'enterprise_%' OR name='_node_server_migrations')"
        )
      ).rows
    ).toHaveLength(0);
    expect(
      (await client.execute("SELECT * FROM existing_business")).rows
    ).toEqual([{ id: 7, value: "unchanged" }]);
  });
  it("refuses an unmarked partial schema without changing it", async () => {
    const client = await oldDatabase();
    await client.execute("CREATE TABLE enterprise_tenant (original TEXT)");
    await expect(migrateEnterpriseAssets(client)).rejects.toThrow(
      "without a migration marker"
    );
    expect(
      (await client.execute("PRAGMA table_info(enterprise_tenant)")).rows[0]
        .name
    ).toBe("original");
  });
  it("rolls back both schema and metadata when a reserved menu ID is occupied", async () => {
    const client = await oldDatabase();
    await client.execute(
      "INSERT INTO system_menu(id,name,icon,sort,business,is_enabled,creator_id) VALUES(108,'Custom','keep',1,'custom',1,1)"
    );
    await expect(migrateEnterpriseAssets(client)).rejects.toThrow(
      "malformed JSON"
    );
    expect(
      (await client.execute("SELECT name FROM system_menu WHERE id=108"))
        .rows[0].name
    ).toBe("Custom");
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'enterprise_%'"
        )
      ).rows
    ).toHaveLength(0);
    expect(
      (
        await client.execute(
          "SELECT code FROM system_permission WHERE code LIKE 'enterprise.%'"
        )
      ).rows
    ).toHaveLength(0);
  });
  it("checks contracts without writes and enforces tenant composite foreign keys", async () => {
    const client = await oldDatabase();
    await migrateEnterpriseAssets(client);
    await client.executeMultiple(tenantFixtureSql);
    const before = (
      await client.execute(
        "SELECT type,name,sql FROM sqlite_master ORDER BY name"
      )
    ).rows;
    await client.executeMultiple(enterpriseAssetsContractSql);
    expect(
      (
        await client.execute(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        )
      ).rows
    ).toEqual(before);
    await expect(
      client.execute(
        "INSERT INTO enterprise_asset_assignment(tenant_id,asset_id,host_asset_id,location,valid_from_utc,valid_to_utc,reason,creator_id,create_time_utc) VALUES(1,1,2,'cross-tenant',100,NULL,'invalid',10,100)"
      )
    ).rejects.toThrow("FOREIGN KEY");
  });
  it.each(invalidEnterpriseSchemas)(
    "rejects $defect in the deployment contract",
    async ({ change }) => {
      const client = await oldDatabase();
      expect(change(enterpriseAssetsMigrationSql)).not.toBe(
        enterpriseAssetsMigrationSql
      );
      await client.executeMultiple(change(enterpriseAssetsMigrationSql));
      await expect(
        client.executeMultiple(enterpriseAssetsContractSql)
      ).rejects.toThrow("malformed JSON");
    }
  );
});
