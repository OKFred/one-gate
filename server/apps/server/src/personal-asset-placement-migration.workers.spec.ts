import { env, reset } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../d1-migrations/0023_personal_asset_placement.sql?raw";
import contractSql from "../d1-contract/personal-asset-placement.sql?raw";
import workerContractSql from "../d1-contract/worker-schema.sql?raw";
import {
  existingBusinessSql,
  sqlStatements,
} from "../test/fixtures/enterprise-assets-migration";
import { existingCalendarSql } from "../test/fixtures/calendar-subscription-migration";

async function execute(sql: string): Promise<void> {
  await env.DB.batch(
    sqlStatements(sql).map((statement) => env.DB.prepare(statement))
  );
}
beforeEach(async () => {
  await reset();
  await execute(existingBusinessSql + existingCalendarSql);
});
describe("personal asset placement migration on isolated D1", () => {
  it("preserves old data and sequence with the exact Worker contract and repeat DDL", async () => {
    expect(
      workerContractSql.match(
        /-- personal-asset-placement-contract-start\s*([\s\S]*?)\s*-- personal-asset-placement-contract-end/
      )?.[1]
    ).toBe(contractSql.trim());
    const events = (
      await env.DB.prepare("SELECT * FROM personal_calendar_event").all()
    ).results;
    await execute(migrationSql);
    await execute(migrationSql);
    await execute(contractSql);
    expect(
      (await env.DB.prepare("SELECT * FROM personal_calendar_event").all())
        .results
    ).toEqual(events);
    expect(
      await env.DB.prepare(
        "SELECT seq FROM sqlite_sequence WHERE name='existing_business'"
      ).first("seq")
    ).toBe(900);
    expect(
      (await env.DB.prepare("SELECT * FROM personal_asset_placement").all())
        .results
    ).toEqual([]);
  });
  it("rolls back schema creation on late contract failure and allows a corrected retry", async () => {
    const weakened = migrationSql.replace('"version" >= 1', '"version" >= 0');
    expect(weakened).not.toBe(migrationSql);
    await expect(execute(weakened)).rejects.toThrow();
    expect(
      await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE name='personal_asset_placement'"
      ).first("name")
    ).toBeNull();
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS n FROM personal_calendar_event"
      ).first("n")
    ).toBe(1);
    await execute(migrationSql);
  });
  it("rejects unexpected indexes, columns and unmarked incompatible tables without dropping data", async () => {
    await execute(
      "CREATE TABLE personal_asset_placement(owner_user_id INTEGER); INSERT INTO personal_asset_placement VALUES(7);"
    );
    await expect(execute(migrationSql)).rejects.toThrow();
    expect(
      await env.DB.prepare(
        "SELECT owner_user_id FROM personal_asset_placement"
      ).first("owner_user_id")
    ).toBe(7);
    await execute("DROP TABLE personal_asset_placement;");
    await execute(migrationSql);
    await execute(
      "CREATE INDEX synthetic_extra_placement_index ON personal_asset_placement(version);"
    );
    await expect(execute(contractSql)).rejects.toThrow();
    await execute(
      "DROP INDEX synthetic_extra_placement_index; ALTER TABLE personal_asset_placement ADD COLUMN unexpected TEXT;"
    );
    await expect(execute(contractSql)).rejects.toThrow();
  });
  it.each([
    [null, 1],
    ["OpenLife", null],
    ["OpenLife", 2],
    ["OpenMind", 0],
    ["OpenMind", 5],
    ["other", 1],
  ] as const)(
    "rejects unsupported or half-null placement %s/%s",
    async (site, floor) => {
      await execute(migrationSql);
      await expect(
        env.DB.prepare(
          "INSERT INTO personal_asset_placement(owner_user_id,tenant_id,asset_id,site,floor,version,create_time_utc,update_time_utc) VALUES (7,11,'synthetic-invalid',?,?,1,100,100)"
        )
          .bind(site, floor)
          .run()
      ).rejects.toThrow();
    }
  );
});
