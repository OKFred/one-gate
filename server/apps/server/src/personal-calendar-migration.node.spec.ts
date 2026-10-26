import { createClient, type Client } from "@libsql/client";
import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  migratePersonalCalendar,
  personalCalendarContractSql,
  personalCalendarMigrationId,
  personalCalendarMigrationSql,
} from "../scripts/migrate-personal-calendar";
import { generateCalendarArtifacts } from "../../../scripts/generate-personal-calendar";
import { existingBusinessSql } from "../test/fixtures/enterprise-assets-migration";

const clients: Client[] = [];
const directories: string[] = [];
async function oldDatabase(): Promise<Client> {
  const directory = mkdtempSync(join(tmpdir(), "one-gate-calendar-migration-"));
  directories.push(directory);
  const client = createClient({
    url: pathToFileURL(join(directory, "test.db")).href,
  });
  clients.push(client);
  await client.executeMultiple(existingBusinessSql);
  return client;
}
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
  for (const directory of directories.splice(0)) {
    const target = resolve(directory);
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith("one-gate-calendar-migration-")
    )
      throw new Error(
        "Refusing calendar fixture cleanup outside its owned temporary directory"
      );
    try {
      for (const name of ["test.db", "test.db-wal", "test.db-shm"])
        rmSync(join(target, name), { force: true });
      rmdirSync(target);
    } catch (error: unknown) {
      // libsql can retain a native file handle until process exit on Windows.
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

function historyHashes(): string[] {
  return ["d1-migrations", "postgresql-migrations"].flatMap((directory) => {
    const folder = new URL(`../${directory}/`, import.meta.url);
    return readdirSync(folder)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map(
        (name) =>
          `${directory}/${name}:${createHash("sha256")
            .update(readFileSync(new URL(name, folder)))
            .digest("hex")}`
      );
  });
}

describe("personal calendar additive SQLite migration", () => {
  it("preserves existing records and sequence, creates no events or seeds, and repeats safely", async () => {
    const client = await oldDatabase();
    expect(await migratePersonalCalendar(client)).toBe("applied");
    expect(await migratePersonalCalendar(client)).toBe("already_applied");
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
      (await client.execute("SELECT * FROM personal_calendar_event")).rows
    ).toEqual([]);
    expect(
      (await client.execute("SELECT id FROM _node_server_migrations")).rows
    ).toEqual([{ id: personalCalendarMigrationId }]);
    const before = (
      await client.execute(
        "SELECT type,name,sql FROM sqlite_master ORDER BY name"
      )
    ).rows;
    await client.executeMultiple(personalCalendarContractSql);
    expect(
      (
        await client.execute(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        )
      ).rows
    ).toEqual(before);
    expect(
      before
        .filter((row) => row.type === "table")
        .map((row) => row.name)
        .sort()
    ).toEqual([
      "_node_server_migrations",
      "existing_business",
      "personal_calendar_event",
      "sqlite_sequence",
    ]);
  });
  it("rolls back new table and marker on a conflicting index without changing the old index", async () => {
    const client = await oldDatabase();
    await client.execute(
      "CREATE INDEX personal_calendar_event_owner_start_idx ON existing_business(value)"
    );
    const before = (
      await client.execute(
        "SELECT type,name,sql FROM sqlite_master ORDER BY name"
      )
    ).rows;
    await expect(migratePersonalCalendar(client)).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        )
      ).rows
    ).toEqual(before);
    expect(
      (await client.execute("SELECT * FROM existing_business")).rows
    ).toEqual([{ id: 7, value: "unchanged" }]);
  });
  it("refuses unmarked tables and detects checksum or structural drift", async () => {
    const client = await oldDatabase();
    await client.execute("CREATE TABLE personal_calendar_event (id TEXT)");
    await expect(migratePersonalCalendar(client)).rejects.toThrow(
      "without a migration marker"
    );
    await client.execute("DROP TABLE personal_calendar_event");
    await migratePersonalCalendar(client);
    await client.execute(
      "ALTER TABLE personal_calendar_event ADD COLUMN unexpected TEXT"
    );
    await expect(migratePersonalCalendar(client)).rejects.toThrow();
    await client.execute(
      "UPDATE _node_server_migrations SET checksum='synthetic-drift'"
    );
    await expect(migratePersonalCalendar(client)).rejects.toThrow(
      "checksum mismatch"
    );
  });
  it.each([
    [
      "default",
      (sql: string) =>
        sql.replace(
          "`version` integer NOT NULL",
          "`version` integer DEFAULT 1 NOT NULL"
        ),
    ],
    [
      "partial index",
      (sql: string) =>
        sql.replace(/ WHERE "personal_calendar_event"\."status"[^;]+/, ""),
    ],
    [
      "index order",
      (sql: string) =>
        sql.replace(
          "(`owner_user_id`,`start_time_utc`,`id`)",
          "(`start_time_utc`,`owner_user_id`,`id`)"
        ),
    ],
    [
      "weakened check",
      (sql: string) => sql.replace('"version" >= 1', '"version" >= 0'),
    ],
    [
      "case-sensitive check literal",
      (sql: string) =>
        sql.replace("IN ('active', 'cancelled')", "IN ('ACTIVE', 'cancelled')"),
    ],
    [
      "whitespace-sensitive check literal",
      (sql: string) =>
        sql.replace(
          "IN ('active', 'cancelled')",
          "IN ('active ', 'cancelled')"
        ),
    ],
  ] as const)(
    "rejects %s drift before a success marker",
    async (_defect, change) => {
      const client = await oldDatabase();
      const ddl = personalCalendarMigrationSql.slice(
        0,
        personalCalendarMigrationSql.indexOf("-- Read-only")
      );
      await client.executeMultiple(change(ddl));
      await expect(
        client.executeMultiple(personalCalendarContractSql)
      ).rejects.toThrow();
    }
  );
  it("rejects unexpected triggers and explicit indexes on an applied table", async () => {
    const client = await oldDatabase();
    await migratePersonalCalendar(client);
    await client.execute(
      "CREATE INDEX synthetic_extra_calendar_idx ON personal_calendar_event(title)"
    );
    await expect(migratePersonalCalendar(client)).rejects.toThrow();
    await client.execute("DROP INDEX synthetic_extra_calendar_idx");
    await client.execute(
      "CREATE TRIGGER synthetic_calendar_trigger AFTER INSERT ON personal_calendar_event BEGIN SELECT 1; END"
    );
    await expect(migratePersonalCalendar(client)).rejects.toThrow();
  });
  it("reproduces targeted artifacts without changing any historical migration byte", () => {
    const before = historyHashes();
    for (const [file, generated] of generateCalendarArtifacts())
      expect(
        readFileSync(new URL("../../../" + file, import.meta.url), "utf8")
      ).toBe(generated);
    expect(historyHashes()).toEqual(before);
    expect(personalCalendarMigrationSql).not.toMatch(
      /\b(?:DEFAULT|INSERT|DROP|DELETE)\b/i
    );
  }, 30_000);
});
