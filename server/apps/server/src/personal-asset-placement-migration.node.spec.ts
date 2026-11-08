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
  migratePersonalAssetPlacement,
  personalAssetPlacementContractSql,
  personalAssetPlacementMetadataSql,
  personalAssetPlacementMigrationId,
  personalAssetPlacementMigrationSql,
} from "../scripts/migrate-personal-asset-placement";
import { generateAssetPlacementArtifacts } from "../../../scripts/generate-personal-asset-placement";
import { checkPostgresDdl } from "../../../scripts/postgresql/generate";
import {
  existingBusinessSql,
  existingMetadataSql,
} from "../test/fixtures/enterprise-assets-migration";
import { retainedCalendarEventSql } from "../test/fixtures/calendar-subscription-migration";

const clients: Client[] = [];
const directories: string[] = [];
async function oldDatabase(): Promise<Client> {
  const directory = mkdtempSync(
    join(tmpdir(), "one-gate-placement-migration-")
  );
  directories.push(directory);
  const client = createClient({
    url: pathToFileURL(join(directory, "test.db")).href,
  });
  clients.push(client);
  await client.executeMultiple(existingBusinessSql + existingMetadataSql);
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
      !basename(target).startsWith("one-gate-placement-migration-")
    )
      throw new Error(
        "Refusing placement fixture cleanup outside its owned temporary directory"
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
const ddl = personalAssetPlacementMigrationSql.slice(
  0,
  personalAssetPlacementMigrationSql.indexOf("-- Read-only")
);

describe("personal asset placement additive SQLite migration", () => {
  it("keeps the fresh PostgreSQL aggregate equal to the registered models without writing files", async () => {
    expect(await checkPostgresDdl()).toBe("current");
  }, 30000);
  it("preserves business data, calendar, sequence and markers, creates no placements and repeats safely", async () => {
    const client = await oldDatabase();
    const events = (
      await client.execute("SELECT * FROM personal_calendar_event")
    ).rows;
    const markers = (
      await client.execute("SELECT * FROM _node_server_migrations ORDER BY id")
    ).rows;
    expect(await migratePersonalAssetPlacement(client)).toBe("applied");
    expect(await migratePersonalAssetPlacement(client)).toBe("already_applied");
    expect(
      (await client.execute("SELECT * FROM personal_calendar_event")).rows
    ).toEqual(events);
    expect(
      (await client.execute("SELECT * FROM personal_asset_placement")).rows
    ).toEqual([]);
    expect(
      (
        await client.execute(
          "SELECT * FROM _node_server_migrations ORDER BY id"
        )
      ).rows.slice(0, 1)
    ).toEqual(markers);
    expect(
      (
        await client.execute(
          "SELECT seq FROM sqlite_sequence WHERE name='existing_business'"
        )
      ).rows[0].seq
    ).toBe(900);
    const schema = (
      await client.execute(
        "SELECT type,name,sql FROM sqlite_master ORDER BY name"
      )
    ).rows;
    await client.executeMultiple(personalAssetPlacementContractSql);
    expect(
      (
        await client.execute(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        )
      ).rows
    ).toEqual(schema);
  });
  it("rolls back late marker failure and permits a corrected retry", async () => {
    const client = await oldDatabase();
    await client.execute(
      `CREATE TRIGGER synthetic_marker_failure BEFORE INSERT ON _node_server_migrations WHEN NEW.id='${personalAssetPlacementMigrationId}' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END`
    );
    const schema = (
      await client.execute(
        "SELECT type,name,sql FROM sqlite_master ORDER BY name"
      )
    ).rows;
    await expect(migratePersonalAssetPlacement(client)).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        )
      ).rows
    ).toEqual(schema);
    expect(
      (await client.execute("SELECT id FROM _node_server_migrations")).rows
    ).toEqual([{ id: "0020_personal_calendar" }]);
    expect(
      (
        await client.execute(
          "SELECT count(*) AS n FROM personal_calendar_event"
        )
      ).rows[0].n
    ).toBe(1);
    expect(
      (
        await client.execute(
          "SELECT id FROM system_permission WHERE code LIKE 'personal.asset:%'"
        )
      ).rows
    ).toEqual([]);
    expect(
      (
        await client.execute(
          "SELECT id FROM i18n_translation WHERE business='personal.asset'"
        )
      ).rows
    ).toEqual([]);
    await client.execute("DROP TRIGGER synthetic_marker_failure");
    expect(await migratePersonalAssetPlacement(client)).toBe("applied");
  });
  it("rolls back the new table and marker on a metadata menu collision and retries safely", async () => {
    const client = await oldDatabase();
    await client.execute(
      "INSERT INTO system_menu(id,name,icon,sort,business,is_enabled,creator_id) VALUES(81,'custom','keep',0,'custom',1,1)"
    );
    const menu = (await client.execute("SELECT * FROM system_menu ORDER BY id"))
      .rows;
    const markers = (
      await client.execute("SELECT * FROM _node_server_migrations ORDER BY id")
    ).rows;
    await expect(migratePersonalAssetPlacement(client)).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT name FROM sqlite_master WHERE name='personal_asset_placement'"
        )
      ).rows
    ).toEqual([]);
    expect(
      (
        await client.execute(
          "SELECT * FROM _node_server_migrations ORDER BY id"
        )
      ).rows
    ).toEqual(markers);
    expect(
      (await client.execute("SELECT * FROM system_menu ORDER BY id")).rows
    ).toEqual(menu);
    expect(
      (
        await client.execute(
          "SELECT id FROM system_permission WHERE code LIKE 'personal.asset:%'"
        )
      ).rows
    ).toEqual([]);
    expect(
      (
        await client.execute(
          "SELECT count(*) AS n FROM personal_calendar_event"
        )
      ).rows[0].n
    ).toBe(1);
    await client.execute("DELETE FROM system_menu WHERE id=81");
    expect(await migratePersonalAssetPlacement(client)).toBe("applied");
  });
  it("installs metadata once, preserves existing grants and includes metadata in the success checksum", async () => {
    const client = await oldDatabase();
    await client.executeMultiple(
      "INSERT INTO system_permission(id,code,name,category,is_enabled,creator_id) VALUES(50,'existing:read','Keep','action',1,1); INSERT INTO system_role_permission(role_id,permission_id,creator_id) VALUES(9,50,1);"
    );
    const originalMenu = (
      await client.execute("SELECT * FROM system_menu WHERE id=107")
    ).rows;
    const originalGrant = (
      await client.execute(
        "SELECT * FROM system_role_permission WHERE role_id=9"
      )
    ).rows;
    expect(await migratePersonalAssetPlacement(client)).toBe("applied");
    const metadata = async () =>
      Promise.all([
        client.execute("SELECT * FROM system_menu ORDER BY id"),
        client.execute("SELECT * FROM system_permission ORDER BY id"),
        client.execute("SELECT * FROM system_role_permission ORDER BY id"),
        client.execute("SELECT * FROM system_role ORDER BY id"),
        client.execute("SELECT * FROM i18n_translation ORDER BY id"),
      ]).then((results) => results.map((result) => result.rows));
    const first = await metadata();
    expect(await migratePersonalAssetPlacement(client)).toBe("already_applied");
    expect(await metadata()).toEqual(first);
    expect(
      (await client.execute("SELECT * FROM system_menu WHERE id=107")).rows
    ).toEqual(originalMenu);
    expect(
      (
        await client.execute(
          "SELECT * FROM system_role_permission WHERE role_id=9"
        )
      ).rows
    ).toEqual(originalGrant);
    expect(
      (
        await client.execute(
          "SELECT path,business FROM system_menu WHERE id=81"
        )
      ).rows
    ).toEqual([{ path: "/personal/asset", business: "personal.asset" }]);
    expect(
      (
        await client.execute(
          "SELECT p.code FROM system_role_permission rp JOIN system_permission p ON p.id=rp.permission_id WHERE rp.role_id=1 ORDER BY p.code"
        )
      ).rows
    ).toEqual([
      { code: "personal.asset:read" },
      { code: "personal.asset:update" },
    ]);
    expect(
      (
        await client.execute(
          "SELECT COUNT(*) AS n FROM i18n_translation WHERE business='personal.asset'"
        )
      ).rows[0].n
    ).toBe(8);
    expect(
      (
        await client.execute({
          sql: "SELECT checksum FROM _node_server_migrations WHERE id=?",
          args: [personalAssetPlacementMigrationId],
        })
      ).rows[0].checksum
    ).toBe(
      createHash("sha256")
        .update(personalAssetPlacementMigrationSql)
        .update(personalAssetPlacementMetadataSql)
        .update(personalAssetPlacementContractSql)
        .digest("hex")
    );
  });
  it("rejects unmarked tables, checksum drift and post-migration schema drift", async () => {
    const client = await oldDatabase();
    await client.execute(
      "CREATE TABLE personal_asset_placement(owner_user_id INTEGER)"
    );
    await expect(migratePersonalAssetPlacement(client)).rejects.toThrow(
      "without a migration marker"
    );
    await client.execute("DROP TABLE personal_asset_placement");
    await migratePersonalAssetPlacement(client);
    await client.execute(
      "ALTER TABLE personal_asset_placement ADD COLUMN unexpected TEXT"
    );
    await expect(migratePersonalAssetPlacement(client)).rejects.toThrow();
    await client.execute({
      sql: "UPDATE _node_server_migrations SET checksum='synthetic-drift' WHERE id=?",
      args: [personalAssetPlacementMigrationId],
    });
    await expect(migratePersonalAssetPlacement(client)).rejects.toThrow(
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
      "weakened version",
      (sql: string) => sql.replace('"version" >= 1', '"version" >= 0'),
    ],
    [
      "changed location case",
      (sql: string) => sql.replaceAll("OpenLife", "openlife"),
    ],
    [
      "weakened nullable pair",
      (sql: string) =>
        sql.replace('"personal_asset_placement"."site" IS NOT NULL AND ', ""),
    ],
  ] as const)("rejects exact contract drift: %s", async (_name, change) => {
    const client = await oldDatabase();
    expect(change(ddl)).not.toBe(ddl);
    await client.executeMultiple(change(ddl));
    await expect(
      client.executeMultiple(personalAssetPlacementContractSql)
    ).rejects.toThrow();
  });
  it("enforces owner/tenant/asset identity, valid versions and paired supported locations", async () => {
    const client = await oldDatabase();
    await migratePersonalAssetPlacement(client);
    const insert = (
      owner: number,
      tenant: number,
      asset: string,
      site: string | null,
      floor: number | null,
      version = 1
    ) =>
      client.execute({
        sql: "INSERT INTO personal_asset_placement(owner_user_id,tenant_id,asset_id,site,floor,version,create_time_utc,update_time_utc) VALUES (?,?,?,?,?,?,100,100)",
        args: [owner, tenant, asset, site, floor, version],
      });
    await insert(7, 11, "synthetic-a", null, null);
    await insert(8, 11, "synthetic-a", "OpenLife", 1);
    await insert(7, 12, "synthetic-a", "OpenMind", 4);
    for (const floor of [1, 2, 3, 4])
      await insert(7, 11, `synthetic-floor-${floor}`, "OpenMind", floor);
    await expect(insert(7, 11, "synthetic-a", null, null)).rejects.toThrow();
    for (const [site, floor, version] of [
      [null, 1, 1],
      ["OpenLife", null, 1],
      ["OpenLife", 2, 1],
      ["OpenMind", 0, 1],
      ["OpenMind", 5, 1],
      ["other", 1, 1],
      [null, null, 0],
    ] as const)
      await expect(
        insert(7, 11, "synthetic-invalid", site, floor, version)
      ).rejects.toThrow();
    expect(
      (
        await client.execute(
          "SELECT count(*) AS n FROM personal_asset_placement"
        )
      ).rows[0].n
    ).toBe(7);
  });
  it("reproduces targeted artifacts without changing historical bytes or adding defaults/seeds", () => {
    const before = historyHashes();
    for (const [file, generated] of generateAssetPlacementArtifacts())
      expect(
        readFileSync(new URL("../../../" + file, import.meta.url), "utf8")
      ).toBe(generated);
    expect(historyHashes()).toEqual(before);
    expect(personalAssetPlacementMigrationSql).not.toMatch(
      /\b(?:DEFAULT|INSERT|DROP|DELETE)\b/i
    );
  }, 30000);
});
