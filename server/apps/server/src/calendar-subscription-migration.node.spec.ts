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
import { migratePersonalCalendar } from "../scripts/migrate-personal-calendar";
import {
  migratePersonalCalendarSubscription,
  personalCalendarSubscriptionContractSql,
  personalCalendarSubscriptionMigrationId,
  personalCalendarSubscriptionMigrationSql,
} from "../scripts/migrate-personal-calendar-subscription";
import { generateCalendarSubscriptionArtifacts } from "../../../scripts/generate-personal-calendar-subscription";
import { existingBusinessSql } from "../test/fixtures/enterprise-assets-migration";
import { retainedCalendarEventSql } from "../test/fixtures/calendar-subscription-migration";

const clients: Client[] = [];
const directories: string[] = [];
async function oldDatabase(): Promise<Client> {
  const directory = mkdtempSync(join(tmpdir(), "one-gate-ics-migration-"));
  directories.push(directory);
  const client = createClient({
    url: pathToFileURL(join(directory, "test.db")).href,
  });
  clients.push(client);
  await client.executeMultiple(existingBusinessSql);
  await migratePersonalCalendar(client);
  await client.executeMultiple(retainedCalendarEventSql);
  return client;
}
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
  for (const directory of directories.splice(0)) {
    const target = resolve(directory);
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith("one-gate-ics-migration-")
    )
      throw new Error(
        "Refusing subscription fixture cleanup outside its owned temporary directory"
      );
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
const ddl = personalCalendarSubscriptionMigrationSql.slice(
  0,
  personalCalendarSubscriptionMigrationSql.indexOf("-- Read-only")
);
describe("private calendar subscription additive SQLite migration", () => {
  it("preserves events, old ledger and sequence, creates no subscriptions, and repeats safely", async () => {
    const client = await oldDatabase();
    const events = (
      await client.execute("SELECT * FROM personal_calendar_event")
    ).rows;
    const previousMarker = (
      await client.execute("SELECT * FROM _node_server_migrations ORDER BY id")
    ).rows;
    expect(await migratePersonalCalendarSubscription(client)).toBe("applied");
    expect(await migratePersonalCalendarSubscription(client)).toBe(
      "already_applied"
    );
    expect(
      (await client.execute("SELECT * FROM personal_calendar_event")).rows
    ).toEqual(events);
    expect(
      (
        await client.execute(
          "SELECT * FROM _node_server_migrations ORDER BY id"
        )
      ).rows.slice(0, 1)
    ).toEqual(previousMarker);
    expect(
      (await client.execute("SELECT * FROM personal_calendar_subscription"))
        .rows
    ).toEqual([]);
    expect(
      (
        await client.execute(
          "SELECT seq FROM sqlite_sequence WHERE name='existing_business'"
        )
      ).rows[0].seq
    ).toBe(900);
    const before = (
      await client.execute(
        "SELECT type,name,sql FROM sqlite_master ORDER BY name"
      )
    ).rows;
    await client.executeMultiple(personalCalendarSubscriptionContractSql);
    expect(
      (
        await client.execute(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        )
      ).rows
    ).toEqual(before);
  });
  it("rolls back an index collision and retries without changing existing events or markers", async () => {
    const client = await oldDatabase();
    await client.execute(
      "CREATE INDEX personal_calendar_subscription_token_unique ON existing_business(value)"
    );
    const before = (
      await client.execute(
        "SELECT type,name,sql FROM sqlite_master ORDER BY name"
      )
    ).rows;
    await expect(migratePersonalCalendarSubscription(client)).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        )
      ).rows
    ).toEqual(before);
    expect(
      (await client.execute("SELECT id FROM _node_server_migrations")).rows
    ).toEqual([{ id: "0020_personal_calendar" }]);
    await client.execute(
      "DROP INDEX personal_calendar_subscription_token_unique"
    );
    expect(await migratePersonalCalendarSubscription(client)).toBe("applied");
  });
  it("rejects unmarked tables and checksum or column drift", async () => {
    const client = await oldDatabase();
    await client.execute(
      "CREATE TABLE personal_calendar_subscription(owner_user_id INTEGER)"
    );
    await expect(migratePersonalCalendarSubscription(client)).rejects.toThrow(
      "without a migration marker"
    );
    await client.execute("DROP TABLE personal_calendar_subscription");
    await migratePersonalCalendarSubscription(client);
    await client.execute(
      "ALTER TABLE personal_calendar_subscription ADD COLUMN unexpected TEXT"
    );
    await expect(migratePersonalCalendarSubscription(client)).rejects.toThrow();
    await client.execute({
      sql: "UPDATE _node_server_migrations SET checksum='synthetic-drift' WHERE id=?",
      args: [personalCalendarSubscriptionMigrationId],
    });
    await expect(migratePersonalCalendarSubscription(client)).rejects.toThrow(
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
      "missing uniqueness",
      (sql: string) => sql.replace("CREATE UNIQUE INDEX", "CREATE INDEX"),
    ],
    [
      "weakened version",
      (sql: string) => sql.replace('"version" >= 1', '"version" >= 0'),
    ],
    [
      "digest alphabet case",
      (sql: string) => sql.replace("*[^0-9a-f]*", "*[^0-9A-F]*"),
    ],
    [
      "digest alphabet whitespace",
      (sql: string) => sql.replace("*[^0-9a-f]*", "*[^0-9a-f ]*"),
    ],
  ] as const)("rejects exact contract drift: %s", async (_name, change) => {
    const client = await oldDatabase();
    await client.executeMultiple(change(ddl));
    await expect(
      client.executeMultiple(personalCalendarSubscriptionContractSql)
    ).rejects.toThrow();
  });
  it("supports multiple revoked owners while enforcing owner, version and unique lowercase digests", async () => {
    const client = await oldDatabase();
    await migratePersonalCalendarSubscription(client);
    const insert = (owner: number, hash: string | null, version = 1) =>
      client.execute({
        sql: "INSERT INTO personal_calendar_subscription(owner_user_id,token_hash,version,create_time_utc,update_time_utc) VALUES (?,?,?,100,100)",
        args: [owner, hash, version],
      });
    await insert(7, null);
    await insert(8, null);
    await insert(9, "a".repeat(64));
    await expect(insert(10, "a".repeat(64))).rejects.toThrow();
    await expect(insert(0, null)).rejects.toThrow();
    await expect(insert(10, null, 0)).rejects.toThrow();
    await expect(insert(10, "A".repeat(64))).rejects.toThrow();
    await expect(insert(10, "a".repeat(63))).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT owner_user_id FROM personal_calendar_subscription ORDER BY owner_user_id"
        )
      ).rows
    ).toEqual([
      { owner_user_id: 7 },
      { owner_user_id: 8 },
      { owner_user_id: 9 },
    ]);
  });
  it("reproduces targeted artifacts without changing historical bytes or adding default/seeds", () => {
    const before = historyHashes();
    for (const [file, generated] of generateCalendarSubscriptionArtifacts())
      expect(
        readFileSync(new URL("../../../" + file, import.meta.url), "utf8")
      ).toBe(generated);
    expect(historyHashes()).toEqual(before);
    expect(personalCalendarSubscriptionMigrationSql).not.toMatch(
      /\b(?:DEFAULT|INSERT|DROP|DELETE)\b/i
    );
  }, 30000);
});
