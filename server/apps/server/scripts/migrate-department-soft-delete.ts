import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client } from "@libsql/client";

const migrationId = "0013_department_soft_delete";
export const departmentSoftDeleteMigrationSql = readFileSync(
  new URL("../d1-migrations/0013_department_soft_delete.sql", import.meta.url),
  "utf8"
);

/** One-off local migration. Only this feature's two fixed migrations, without remote targets. */
export async function migrateDepartmentSoftDelete(
  client: Client,
  options: { schemaOnly?: boolean } = {}
): Promise<"applied" | "already_applied"> {
  const checksum = createHash("sha256")
    .update(departmentSoftDeleteMigrationSql)
    .digest("hex");
  const tx = await client.transaction("write");
  let applied = false;
  try {
    await tx.execute(`CREATE TABLE IF NOT EXISTS _node_server_migrations (
      id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, applied_time_utc INTEGER NOT NULL
    )`);
    const previous = await tx.execute({
      sql: "SELECT checksum FROM _node_server_migrations WHERE id = ?",
      args: [migrationId],
    });
    if (previous.rows.length > 0) {
      if (String(previous.rows[0].checksum) !== checksum)
        throw new Error("Migration checksum mismatch");
    } else {
      const before = await tx.execute(
        "SELECT COUNT(*) AS total FROM system_department"
      );
      const sequence = await tx.execute(
        "SELECT COALESCE(MAX(seq), 0) AS seq FROM sqlite_sequence WHERE name = 'system_department'"
      );
      await tx.executeMultiple(departmentSoftDeleteMigrationSql);
      const after = await tx.execute(
        "SELECT COUNT(*) AS total FROM system_department WHERE is_deleted = 0 AND deleted_time_utc IS NULL AND deleter_id IS NULL"
      );
      if (Number(after.rows[0].total) !== Number(before.rows[0].total))
        throw new Error("Department migration row count mismatch");
      const newSequence = await tx.execute(
        "SELECT COALESCE(MAX(seq), 0) AS seq FROM sqlite_sequence WHERE name = 'system_department'"
      );
      if (Number(newSequence.rows[0].seq) < Number(sequence.rows[0].seq))
        throw new Error("Department sequence was not preserved");
      const columns = await tx.execute("PRAGMA table_info(system_department)");
      const deletedColumn = columns.rows.find(
        (column) => column.name === "is_deleted"
      );
      if (
        !deletedColumn ||
        Number(deletedColumn.notnull) !== 1 ||
        deletedColumn.dflt_value !== null
      )
        throw new Error("Department soft-delete column contract mismatch");
      await tx.execute(
        "SELECT id FROM system_department INDEXED BY system_department_deleted_time_idx LIMIT 0"
      );
      await tx.execute(
        "SELECT id FROM system_department INDEXED BY system_department_parent_id_idx LIMIT 0"
      );
      await tx.execute(
        "SELECT id FROM system_department INDEXED BY system_department_name_active_unique WHERE is_deleted = 0 LIMIT 0"
      );
      await tx.execute({
        sql: "INSERT INTO _node_server_migrations (id, checksum, applied_time_utc) VALUES (?, ?, ?)",
        args: [migrationId, checksum, Date.now()],
      });
      applied = true;
    }
    if (!options.schemaOnly) {
      const metadataId = "0014_recycle_bin_menu_permissions";
      const metadataSql = readFileSync(
        new URL(`../d1-migrations/${metadataId}.sql`, import.meta.url),
        "utf8"
      );
      const metadataChecksum = createHash("sha256")
        .update(metadataSql)
        .digest("hex");
      const metadataPrevious = await tx.execute({
        sql: "SELECT checksum FROM _node_server_migrations WHERE id = ?",
        args: [metadataId],
      });
      if (metadataPrevious.rows.length > 0) {
        if (String(metadataPrevious.rows[0].checksum) !== metadataChecksum)
          throw new Error("Metadata migration checksum mismatch");
      } else {
        await tx.executeMultiple(metadataSql);
        await tx.execute({
          sql: "INSERT INTO _node_server_migrations (id, checksum, applied_time_utc) VALUES (?, ?, ?)",
          args: [metadataId, metadataChecksum, Date.now()],
        });
        applied = true;
      }
    }
    await tx.commit();
    return applied ? "applied" : "already_applied";
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
  if (!argument)
    throw new Error(
      "Usage: pnpm db:migrate:department:node --database=<local SQLite file>"
    );
  const file = argument.slice("--database=".length);
  if (
    !file ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(file) ||
    /^[\\/]{2}/.test(file) ||
    file === ":memory:"
  )
    throw new Error("A local SQLite file path is required");
  const databasePath = resolve(file);
  if (!statSync(databasePath).isFile())
    throw new Error("An existing SQLite file is required");
  const client = createClient({ url: pathToFileURL(databasePath).href });
  try {
    console.log(
      await migrateDepartmentSoftDelete(client, {
        schemaOnly: process.argv.includes("--schema-only"),
      })
    );
  } finally {
    client.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch(() => {
    console.error("Department soft-delete migration did not complete");
    process.exitCode = 1;
  });
}
