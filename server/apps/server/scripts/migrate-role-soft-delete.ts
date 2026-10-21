import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client, type Transaction } from "@libsql/client";

const migrationId = "0015_role_soft_delete";
export const roleSoftDeleteMigrationSql = readFileSync(
  new URL("../d1-migrations/0015_role_soft_delete.sql", import.meta.url),
  "utf8"
);
const preflightMatch = roleSoftDeleteMigrationSql.match(
  /-- role-soft-delete-preflight-start\s*([\s\S]*?)\s*-- role-soft-delete-preflight-end/
);
if (!preflightMatch) throw new Error("Role migration preflight is missing");
const preflightSql = preflightMatch[1];

export class RoleSoftDeletePreflightError extends Error {
  constructor(readonly summary: Readonly<Record<string, number>>) {
    super(`Role migration preflight failed: ${JSON.stringify(summary)}`);
    this.name = "RoleSoftDeletePreflightError";
  }
}

async function assertPreflight(tx: Transaction): Promise<void> {
  const result = await tx.execute(preflightSql);
  const issues = Object.fromEntries(
    Object.entries(result.rows[0])
      .filter(([, total]) => Number(total) > 0)
      .map(([issue, total]) => [issue, Number(total)])
  );
  if (Object.keys(issues).length > 0)
    throw new RoleSoftDeletePreflightError(issues);
}

async function assertSchema(tx: Transaction): Promise<void> {
  const columns = await tx.execute("PRAGMA table_info(system_role)");
  for (const name of ["is_deleted", "deleted_time_utc", "deleter_id"]) {
    const column = columns.rows.find((item) => item.name === name);
    if (
      !column ||
      column.dflt_value !== null ||
      Number(column.notnull) !== (name === "is_deleted" ? 1 : 0)
    )
      throw new Error("Role soft-delete column contract mismatch");
  }
  const schema = await tx.execute(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='system_role'"
  );
  if (
    !String(schema.rows[0]?.sql).includes("system_role_soft_delete_state_check")
  )
    throw new Error("Role soft-delete state constraint is missing");
  await tx.execute(
    "SELECT id FROM system_role INDEXED BY system_role_name_active_unique WHERE is_deleted=0 LIMIT 0"
  );
  await tx.execute(
    "SELECT id FROM system_role INDEXED BY system_role_deleted_time_idx LIMIT 0"
  );
}

/** Fixed, local-only migration. Failure rolls back the swap and its success marker. */
export async function migrateRoleSoftDelete(
  client: Client
): Promise<"applied" | "already_applied"> {
  const checksum = createHash("sha256")
    .update(roleSoftDeleteMigrationSql)
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
      if (String(previous.rows[0].checksum) !== checksum)
        throw new Error("Role migration checksum mismatch");
      await assertSchema(tx);
      await assertPreflight(tx);
      await tx.commit();
      return "already_applied";
    }
    const columns = await tx.execute("PRAGMA table_info(system_role)");
    if (columns.rows.some((row) => row.name === "is_deleted"))
      throw new Error(
        "Role schema is already upgraded without a migration marker"
      );
    await assertPreflight(tx);
    const before = await tx.execute(
      "SELECT COUNT(*) AS total FROM system_role"
    );
    const bindingsBefore = await tx.execute(
      "SELECT COUNT(*) AS total FROM system_role_permission"
    );
    const sequence = await tx.execute(
      "SELECT COALESCE(MAX(seq),0) AS seq FROM sqlite_sequence WHERE name='system_role'"
    );
    await tx.executeMultiple(roleSoftDeleteMigrationSql);
    const after = await tx.execute(
      "SELECT COUNT(*) AS total FROM system_role WHERE is_deleted=0 AND deleted_time_utc IS NULL AND deleter_id IS NULL"
    );
    if (Number(after.rows[0].total) !== Number(before.rows[0].total))
      throw new Error("Role migration row count mismatch");
    const bindingsAfter = await tx.execute(
      "SELECT COUNT(*) AS total FROM system_role_permission"
    );
    if (
      Number(bindingsAfter.rows[0].total) !==
      Number(bindingsBefore.rows[0].total)
    )
      throw new Error("Role migration changed permission bindings");
    const newSequence = await tx.execute(
      "SELECT COALESCE(MAX(seq),0) AS seq FROM sqlite_sequence WHERE name='system_role'"
    );
    if (Number(newSequence.rows[0].seq) < Number(sequence.rows[0].seq))
      throw new Error("Role sequence was not preserved");
    await assertSchema(tx);
    await assertPreflight(tx);
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

async function main(): Promise<void> {
  const argument = process.argv
    .slice(2)
    .find((value) => value.startsWith("--database="));
  if (!argument)
    throw new Error(
      "Usage: pnpm db:migrate:role:node --database=<local SQLite file>"
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
    console.log(await migrateRoleSoftDelete(client));
  } finally {
    client.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch((error: unknown) => {
    console.error(
      error instanceof RoleSoftDeletePreflightError
        ? error.message
        : "Role soft-delete migration did not complete"
    );
    process.exitCode = 1;
  });
}
