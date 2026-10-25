import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client } from "@libsql/client";

const migrationId = "0018_cloudflare_usage";
export const cloudflareUsageMigrationSql = readFileSync(
  new URL("../d1-migrations/0018_cloudflare_usage.sql", import.meta.url),
  "utf8"
);
export const cloudflareUsageMetadataSql = readFileSync(
  new URL(
    "../d1-migrations/0019_cloudflare_usage_metadata.sql",
    import.meta.url
  ),
  "utf8"
);
export const cloudflareUsageContractSql = readFileSync(
  new URL("../d1-contract/cloudflare-usage.sql", import.meta.url),
  "utf8"
);
export const cloudflareUsageTables = [
  "cloudflare_usage_daily",
  "cloudflare_usage_snapshot",
  "cloudflare_usage_sync",
] as const;

/** Schema, least-privilege seeds and the success marker share one transaction. */
export async function migrateCloudflareUsage(
  client: Client
): Promise<"applied" | "already_applied"> {
  const checksum = createHash("sha256")
    .update(cloudflareUsageMigrationSql)
    .update(cloudflareUsageMetadataSql)
    .digest("hex");
  const tx = await client.transaction("write");
  try {
    await tx.execute(
      "CREATE TABLE IF NOT EXISTS _node_server_migrations (id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, applied_time_utc INTEGER NOT NULL)"
    );
    const prior = await tx.execute({
      sql: "SELECT checksum FROM _node_server_migrations WHERE id=?",
      args: [migrationId],
    });
    if (prior.rows.length) {
      if (prior.rows[0].checksum !== checksum)
        throw new Error("Cloudflare usage migration checksum mismatch");
      await tx.executeMultiple(cloudflareUsageContractSql);
      await tx.commit();
      return "already_applied";
    }
    const existing = await tx.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name IN (?,?,?)",
      args: [...cloudflareUsageTables],
    });
    if (existing.rows.length)
      throw new Error(
        "Cloudflare usage tables exist without a migration marker"
      );
    await tx.executeMultiple(cloudflareUsageMigrationSql);
    await tx.executeMultiple(cloudflareUsageMetadataSql);
    await tx.executeMultiple(cloudflareUsageContractSql);
    await tx.execute({
      sql: "INSERT INTO _node_server_migrations(id,checksum,applied_time_utc) VALUES (?,?,?)",
      args: [migrationId, checksum, Date.now()],
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
  const argument = args[0];
  if (args.length !== 1 || !argument?.startsWith("--database="))
    throw new Error(
      "Use --database=<absolute path to an existing local SQLite file>"
    );
  const file = argument.slice("--database=".length);
  if (
    !isAbsolute(file) ||
    /^[\\/]{2}/.test(file) ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(file) ||
    !statSync(file).isFile()
  )
    throw new Error("An existing local SQLite file is required");
  const client = createClient({ url: pathToFileURL(file).href });
  try {
    console.log(await migrateCloudflareUsage(client));
  } finally {
    client.close();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch(() => {
    console.error(
      "Cloudflare usage migration did not complete; keep writes paused and inspect migration state"
    );
    process.exitCode = 1;
  });
}
