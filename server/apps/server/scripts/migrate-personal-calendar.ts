import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient, type Client } from "@libsql/client";

export const personalCalendarMigrationId = "0020_personal_calendar";
export const personalCalendarMigrationSql = readFileSync(
  new URL("../d1-migrations/0020_personal_calendar.sql", import.meta.url),
  "utf8"
);
export const personalCalendarContractSql = readFileSync(
  new URL("../d1-contract/personal-calendar.sql", import.meta.url),
  "utf8"
);

/** The additive table, exact contract and completion marker commit together. */
export async function migratePersonalCalendar(
  client: Client
): Promise<"applied" | "already_applied"> {
  const checksum = createHash("sha256")
    .update(personalCalendarMigrationSql)
    .update(personalCalendarContractSql)
    .digest("hex");
  const tx = await client.transaction("write");
  try {
    await tx.execute(
      "CREATE TABLE IF NOT EXISTS _node_server_migrations (id TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, applied_time_utc INTEGER NOT NULL)"
    );
    const prior = await tx.execute({
      sql: "SELECT checksum FROM _node_server_migrations WHERE id=?",
      args: [personalCalendarMigrationId],
    });
    if (prior.rows.length) {
      if (prior.rows[0].checksum !== checksum)
        throw new Error("Personal calendar migration checksum mismatch");
      await tx.executeMultiple(personalCalendarContractSql);
      await tx.commit();
      return "already_applied";
    }
    const existing = await tx.execute(
      "SELECT name FROM sqlite_master WHERE name='personal_calendar_event'"
    );
    if (existing.rows.length)
      throw new Error(
        "Personal calendar table exists without a migration marker"
      );
    await tx.executeMultiple(personalCalendarMigrationSql);
    await tx.executeMultiple(personalCalendarContractSql);
    await tx.execute({
      sql: "INSERT INTO _node_server_migrations(id,checksum,applied_time_utc) VALUES (?,?,?)",
      args: [personalCalendarMigrationId, checksum, Date.now()],
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
    console.log(await migratePersonalCalendar(client));
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
      "Personal calendar migration did not complete; keep writes paused and inspect migration state"
    );
    process.exitCode = 1;
  });
}
