import { createClient, type Client } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  cloudflareUsageContractSql,
  migrateCloudflareUsage,
} from "../scripts/migrate-cloudflare-usage";
import {
  existingBusinessSql,
  existingMetadataSql,
} from "../test/fixtures/enterprise-assets-migration";
import { generateUsageArtifacts } from "../../../scripts/generate-cloudflare-usage";

const clients: Client[] = [];
const directories: string[] = [];
async function oldDatabase(): Promise<Client> {
  const directory = mkdtempSync(join(tmpdir(), "one-gate-usage-migration-"));
  directories.push(directory);
  const client = createClient({
    url: pathToFileURL(join(directory, "test.db")).href,
  });
  clients.push(client);
  await client.executeMultiple(existingBusinessSql + existingMetadataSql);
  return client;
}
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
  for (const directory of directories.splice(0)) {
    try {
      for (const name of ["test.db", "test.db-wal", "test.db-shm"])
        rmSync(join(directory, name), { force: true });
      rmdirSync(directory);
    } catch (error: unknown) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "EPERM"
      )
        throw error;
    }
  }
});

describe("Cloudflare usage additive SQLite migration", () => {
  it("preserves business data and sequence, grants only superadmin, and repeats safely", async () => {
    const client = await oldDatabase();
    expect(await migrateCloudflareUsage(client)).toBe("applied");
    expect(await migrateCloudflareUsage(client)).toBe("already_applied");
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
          "SELECT code FROM system_permission WHERE business='admin.maintenance.cloudflare_usage'"
        )
      ).rows
    ).toHaveLength(2);
    expect(
      (await client.execute("SELECT role_id FROM system_role_permission")).rows
    ).toEqual([{ role_id: 1 }, { role_id: 1 }]);
    expect(
      (
        await client.execute(
          "SELECT permission_count FROM system_role WHERE id=1"
        )
      ).rows[0].permission_count
    ).toBe(2);
    expect(
      (
        await client.execute(
          "SELECT permission_count FROM system_role WHERE id=9"
        )
      ).rows[0].permission_count
    ).toBe(0);
    expect(
      (await client.execute("SELECT id FROM _node_server_migrations")).rows
    ).toHaveLength(1);
    const before = (
      await client.execute(
        "SELECT type,name,sql FROM sqlite_master ORDER BY name"
      )
    ).rows;
    await client.executeMultiple(cloudflareUsageContractSql);
    expect(
      (
        await client.execute(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        )
      ).rows
    ).toEqual(before);
  });
  it("rolls back table creation and permission inserts after metadata failure", async () => {
    const client = await oldDatabase();
    await client.execute("DROP TABLE i18n_translation");
    await expect(migrateCloudflareUsage(client)).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE name LIKE 'cloudflare_usage_%'"
        )
      ).rows
    ).toEqual([]);
    expect(
      (
        await client.execute(
          "SELECT code FROM system_permission WHERE business='admin.maintenance.cloudflare_usage'"
        )
      ).rows
    ).toEqual([]);
    expect(
      (await client.execute("SELECT * FROM existing_business")).rows
    ).toEqual([{ id: 7, value: "unchanged" }]);
  });
  it("rejects unmarked schemas and post-migration column or checksum drift", async () => {
    const client = await oldDatabase();
    await client.execute(
      "CREATE TABLE cloudflare_usage_daily (account_id TEXT)"
    );
    await expect(migrateCloudflareUsage(client)).rejects.toThrow(
      "without a migration marker"
    );
    await client.execute("DROP TABLE cloudflare_usage_daily");
    await migrateCloudflareUsage(client);
    await client.execute(
      "ALTER TABLE cloudflare_usage_daily ADD COLUMN unexpected TEXT"
    );
    await expect(migrateCloudflareUsage(client)).rejects.toThrow();
    await client.execute(
      "UPDATE _node_server_migrations SET checksum='changed'"
    );
    await expect(migrateCloudflareUsage(client)).rejects.toThrow(
      "checksum mismatch"
    );
  });
  it("keeps targeted fresh DDL and standalone/Worker contracts reproducible", () => {
    for (const [file, generated] of generateUsageArtifacts()) {
      expect(
        readFileSync(new URL("../../../" + file, import.meta.url), "utf8")
      ).toBe(generated);
    }
  });
});
