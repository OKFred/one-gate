import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client, type Transaction } from "@libsql/client";

const migrationId = "0016_enterprise_assets";
export const enterpriseAssetsMigrationSql = readFileSync(
  new URL("../d1-migrations/0016_enterprise_assets.sql", import.meta.url),
  "utf8"
);
export const enterpriseAssetsMetadataSql = readFileSync(
  new URL(
    "../d1-migrations/0017_enterprise_asset_metadata.sql",
    import.meta.url
  ),
  "utf8"
);
export const enterpriseAssetsContractSql = readFileSync(
  new URL("../d1-contract/enterprise-assets.sql", import.meta.url),
  "utf8"
);
export const enterpriseAssetTables = [
  "enterprise_tenant",
  "enterprise_tenant_member",
  "enterprise_tenant_api_token_grant",
  "enterprise_asset",
  "enterprise_asset_identifier",
  "enterprise_asset_assignment",
  "enterprise_asset_measurement_binding",
] as const;

async function assertSchema(tx: Transaction) {
  await tx.executeMultiple(enterpriseAssetsContractSql);
  for (const table of enterpriseAssetTables) {
    const foreignKeys = await tx.execute(`PRAGMA foreign_key_check(${table})`);
    if (foreignKeys.rows.length > 0)
      throw new Error("Enterprise asset foreign-key check failed");
  }
}

/** Fixed additive migration. The schema and success marker commit or roll back together. */
export async function migrateEnterpriseAssets(
  client: Client
): Promise<"applied" | "already_applied"> {
  const checksum = createHash("sha256")
    .update(enterpriseAssetsMigrationSql)
    .update(enterpriseAssetsMetadataSql)
    .digest("hex");
  const tx = await client.transaction("write");
  try {
    await tx.execute(`CREATE TABLE IF NOT EXISTS _node_server_migrations (
      id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, applied_time_utc INTEGER NOT NULL
    )`);
    const previous = await tx.execute({
      sql: "SELECT checksum FROM _node_server_migrations WHERE id=?",
      args: [migrationId],
    });
    if (previous.rows.length > 0) {
      if (previous.rows[0].checksum !== checksum)
        throw new Error("Enterprise asset migration checksum mismatch");
      await assertSchema(tx);
      await tx.commit();
      return "already_applied";
    }
    const placeholders = enterpriseAssetTables.map(() => "?").join(",");
    const existing = await tx.execute({
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`,
      args: [...enterpriseAssetTables],
    });
    if (existing.rows.length > 0)
      throw new Error(
        "Enterprise asset schema already exists without a migration marker"
      );
    await tx.executeMultiple(enterpriseAssetsMigrationSql);
    await tx.executeMultiple(enterpriseAssetsMetadataSql);
    await assertSchema(tx);
    await tx.execute({
      sql: "INSERT INTO _node_server_migrations (id,checksum,applied_time_utc) VALUES (?,?,?)",
      args: [migrationId, checksum, Date.now()],
    });
    await tx.commit();
    return "applied";
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
}

async function main() {
  const argument = process.argv
    .slice(2)
    .find((value) => value.startsWith("--database="));
  const file = argument?.slice("--database=".length);
  if (
    !file ||
    !isAbsolute(file) ||
    /^[\\/]{2}/.test(file) ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(file)
  ) {
    throw new Error(
      "Use --database=<absolute path to an existing local SQLite file>"
    );
  }
  if (!statSync(file).isFile())
    throw new Error("An existing SQLite file is required");
  const client = createClient({ url: pathToFileURL(file).href });
  try {
    console.log(await migrateEnterpriseAssets(client));
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
      "Enterprise asset migration did not complete; keep writes paused and inspect the migration state"
    );
    process.exitCode = 1;
  });
}
