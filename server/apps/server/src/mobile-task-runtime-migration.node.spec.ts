import { createClient, type Client } from "@libsql/client";
import { mkdtempSync, readFileSync, rmSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  migrateMobileTaskRuntime,
  mobileTaskRuntimeContractSql,
  mobileTaskRuntimeMigrationId,
} from "../scripts/migrate-mobile-task-runtime";
import { generateMobileTaskRuntimeArtifacts } from "../../../scripts/generate-mobile-task-runtime";
import { existingBusinessSql } from "../test/fixtures/enterprise-assets-migration";

const deviceSql = readFileSync(
  new URL(
    "../../../packages/core/src/db/sql/admin/admin_mobile_device.sql",
    import.meta.url
  ),
  "utf8"
);
const clients: Client[] = [];
const directories: string[] = [];
function fixtureClient(): Client {
  const directory = mkdtempSync(join(tmpdir(), "one-gate-task-runtime-"));
  directories.push(directory);
  const client = createClient({
    url: pathToFileURL(join(directory, "test.db")).href,
  });
  clients.push(client);
  return client;
}
async function oldDatabase(): Promise<Client> {
  const client = fixtureClient();
  await client.executeMultiple(deviceSql + existingBusinessSql);
  await client.execute(
    "INSERT INTO admin_mobile_device(id,client_id,is_enabled,creator_id) VALUES(1,'test-device',1,1)"
  );
  await client.executeMultiple(
    "CREATE TABLE _node_server_migrations(id TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_time_utc INTEGER NOT NULL);INSERT INTO _node_server_migrations VALUES('existing-marker','keep',1);"
  );
  return client;
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const client of clients.splice(0)) client.close();
  for (const directory of directories.splice(0)) {
    const target = resolve(directory);
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith("one-gate-task-runtime-")
    )
      throw new Error("Fixture cleanup escaped its temporary directory");
    try {
      for (const name of ["test.db", "test.db-wal", "test.db-shm"])
        rmSync(join(target, name), { force: true });
      rmdirSync(target);
    } catch (error: unknown) {
      if (
        process.platform !== "win32" ||
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "EPERM"
      )
        throw error;
    }
  }
});

describe("mobile-task-runtime additive SQLite migration", () => {
  it("preserves business records, device data, old markers and sequence, and repeats safely", async () => {
    const client = await oldDatabase();
    const devices = (await client.execute("SELECT * FROM admin_mobile_device"))
      .rows;
    const business = (await client.execute("SELECT * FROM existing_business"))
      .rows;
    const sequence = (
      await client.execute("SELECT * FROM sqlite_sequence ORDER BY name")
    ).rows;
    expect(await migrateMobileTaskRuntime(client)).toBe("applied");
    expect(await migrateMobileTaskRuntime(client)).toBe("already_applied");
    expect(
      (await client.execute("SELECT * FROM admin_mobile_device")).rows
    ).toEqual(devices);
    expect(
      (await client.execute("SELECT * FROM existing_business")).rows
    ).toEqual(business);
    expect(
      (await client.execute("SELECT * FROM sqlite_sequence ORDER BY name")).rows
    ).toEqual(sequence);
    expect(
      (await client.execute("SELECT * FROM admin_mobile_task_runtime")).rows
    ).toEqual([]);
    expect(
      (
        await client.execute(
          "SELECT checksum FROM _node_server_migrations WHERE id='existing-marker'"
        )
      ).rows[0]?.checksum
    ).toBe("keep");
  });

  it("enforces device ownership and clears a deleted device snapshot through the foreign key", async () => {
    const client = await oldDatabase();
    await migrateMobileTaskRuntime(client);
    const insert =
      "INSERT INTO admin_mobile_task_runtime VALUES(?,'session',1,1,1,1,'{}')";
    await expect(
      client.execute({ sql: insert, args: ["unknown-device"] })
    ).rejects.toThrow();
    await client.execute({ sql: insert, args: ["test-device"] });
    await client.execute(
      "DELETE FROM admin_mobile_device WHERE client_id='test-device'"
    );
    expect(
      (await client.execute("SELECT * FROM admin_mobile_task_runtime")).rows
    ).toEqual([]);
  });

  it("rolls back after a post-DDL contract failure and permits a clean retry", async () => {
    const client = await oldDatabase();
    const transaction = client.transaction.bind(client);
    vi.spyOn(client, "transaction").mockImplementation(async (mode) => {
      const tx = await transaction(mode);
      const execute = tx.executeMultiple.bind(tx);
      vi.spyOn(tx, "executeMultiple").mockImplementation(async (sql) => {
        if (sql === mobileTaskRuntimeContractSql)
          throw new Error("injected post-DDL failure");
        return execute(sql);
      });
      return tx;
    });
    await expect(migrateMobileTaskRuntime(client)).rejects.toThrow(
      "injected post-DDL failure"
    );
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE name='admin_mobile_task_runtime'"
        )
      ).rows
    ).toEqual([]);
    expect(
      (
        await client.execute({
          sql: "SELECT id FROM _node_server_migrations WHERE id=?",
          args: [mobileTaskRuntimeMigrationId],
        })
      ).rows
    ).toEqual([]);
    expect(
      (await client.execute("SELECT value FROM existing_business")).rows[0]
        ?.value
    ).toBe("unchanged");
    vi.restoreAllMocks();
    expect(await migrateMobileTaskRuntime(client)).toBe("applied");
  });

  it("refuses a prior object without a marker and preserves it", async () => {
    const client = await oldDatabase();
    await client.execute("CREATE TABLE admin_mobile_task_runtime(value TEXT)");
    await client.execute(
      "INSERT INTO admin_mobile_task_runtime VALUES('keep')"
    );
    await expect(migrateMobileTaskRuntime(client)).rejects.toThrow(
      "without a migration marker"
    );
    expect(
      (await client.execute("SELECT value FROM admin_mobile_task_runtime"))
        .rows[0]?.value
    ).toBe("keep");
  });

  it("rejects a missing or non-unique device parent without leaving the child table", async () => {
    const client = fixtureClient();
    await expect(migrateMobileTaskRuntime(client)).rejects.toThrow(
      "device table is required"
    );
    await client.execute("CREATE TABLE admin_mobile_device(client_id TEXT)");
    await expect(migrateMobileTaskRuntime(client)).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE name='admin_mobile_task_runtime'"
        )
      ).rows
    ).toEqual([]);
  });

  it("rejects marker or schema drift instead of adopting it", async () => {
    const client = await oldDatabase();
    await migrateMobileTaskRuntime(client);
    await client.execute({
      sql: "UPDATE _node_server_migrations SET checksum='wrong' WHERE id=?",
      args: [mobileTaskRuntimeMigrationId],
    });
    await expect(migrateMobileTaskRuntime(client)).rejects.toThrow(
      "checksum mismatch"
    );
  });

  it("keeps targeted DDL and the aggregate contract exact", () => {
    for (const [file, generated] of generateMobileTaskRuntimeArtifacts()) {
      expect(
        readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")
      ).toBe(generated);
    }
  });
});
