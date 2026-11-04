import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client } from "@libsql/client";

export const mobileTaskRuntimeMigrationId = "0022_mobile_task_runtime";
export const mobileTaskRuntimeMigrationSql = readFileSync(
  new URL("../d1-migrations/0022_mobile_task_runtime.sql", import.meta.url),
  "utf8"
);
export const mobileTaskRuntimeContractSql = readFileSync(
  new URL("../d1-contract/mobile-task-runtime.sql", import.meta.url),
  "utf8"
);

/** Keep the additive DDL, exact contract and successful marker in one transaction. */
export async function migrateMobileTaskRuntime(
  client: Client
): Promise<"applied" | "already_applied"> {
  const checksum = createHash("sha256")
    .update(mobileTaskRuntimeMigrationSql)
    .update(mobileTaskRuntimeContractSql)
    .digest("hex");
  const tx = await client.transaction("write");
  try {
    const parent = await tx.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_mobile_device'"
    );
    if (!parent.rows.length)
      throw new Error("Existing mobile device table is required");
    await tx.execute(
      "CREATE TABLE IF NOT EXISTS _node_server_migrations (id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, applied_time_utc INTEGER NOT NULL)"
    );
    const prior = await tx.execute({
      sql: "SELECT checksum FROM _node_server_migrations WHERE id=?",
      args: [mobileTaskRuntimeMigrationId],
    });
    if (prior.rows.length) {
      if (prior.rows[0].checksum !== checksum)
        throw new Error("Mobile task runtime migration checksum mismatch");
      await tx.executeMultiple(mobileTaskRuntimeContractSql);
      await tx.commit();
      return "already_applied";
    }
    const existing = await tx.execute(
      "SELECT name FROM sqlite_master WHERE name='admin_mobile_task_runtime'"
    );
    if (existing.rows.length)
      throw new Error(
        "Mobile task runtime object exists without a migration marker"
      );
    await tx.executeMultiple(mobileTaskRuntimeMigrationSql);
    await tx.executeMultiple(mobileTaskRuntimeContractSql);
    await tx.execute({
      sql: "INSERT INTO _node_server_migrations(id,checksum,applied_time_utc) VALUES (?,?,?)",
      args: [mobileTaskRuntimeMigrationId, checksum, Date.now()],
    });
    await tx.commit();
    return "applied";
  } catch (error: unknown) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !args[0]?.startsWith("--database="))
    throw new Error("Use --database=<absolute existing local SQLite file>");
  const file = args[0].slice("--database=".length);
  if (
    !isAbsolute(file) ||
    /^[\\/]{2}/.test(file) ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(file) ||
    !statSync(file).isFile()
  )
    throw new Error("Existing local SQLite file required");
  const client = createClient({ url: pathToFileURL(file).href });
  try {
    console.log(await migrateMobileTaskRuntime(client));
  } finally {
    client.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  void main().catch(() => {
    console.error(
      "Mobile runtime migration failed; inspect state before resuming writes"
    );
    process.exitCode = 1;
  });
