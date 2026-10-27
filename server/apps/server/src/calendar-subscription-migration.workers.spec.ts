import { env, reset } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../d1-migrations/0021_personal_calendar_subscription.sql?raw";
import contractSql from "../d1-contract/personal-calendar-subscription.sql?raw";
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
describe("calendar subscription migration on isolated D1", () => {
  it("preserves old calendar, data and sequence with the exact Worker contract and repeat DDL", async () => {
    expect(
      workerContractSql.match(
        /-- personal-calendar-subscription-contract-start\s*([\s\S]*?)\s*-- personal-calendar-subscription-contract-end/
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
      (
        await env.DB.prepare(
          "SELECT * FROM personal_calendar_subscription"
        ).all()
      ).results
    ).toEqual([]);
  });
  it("rolls back an index conflict and permits a corrected retry", async () => {
    await env.DB.prepare(
      "CREATE INDEX personal_calendar_subscription_token_unique ON existing_business(value)"
    ).run();
    await expect(execute(migrationSql)).rejects.toThrow();
    expect(
      await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE name='personal_calendar_subscription'"
      ).first("name")
    ).toBeNull();
    expect(
      await env.DB.prepare(
        "SELECT count(*) AS n FROM personal_calendar_event"
      ).first("n")
    ).toBe(1);
    await env.DB.prepare(
      "DROP INDEX personal_calendar_subscription_token_unique"
    ).run();
    await execute(migrationSql);
    await execute(contractSql);
  });
  it.each(["*[^0-9A-F]*", "*[^0-9a-f ]*"])(
    "rejects altered digest constraint literal: %s",
    async (pattern) => {
      const ddl = migrationSql.slice(0, migrationSql.indexOf("-- Read-only"));
      await execute(ddl.replace("*[^0-9a-f]*", pattern));
      await expect(execute(contractSql)).rejects.toThrow();
    }
  );
  it("rejects removed digest uniqueness and extra columns", async () => {
    await execute(migrationSql);
    await env.DB.prepare(
      "DROP INDEX personal_calendar_subscription_token_unique"
    ).run();
    await env.DB.prepare(
      "CREATE INDEX personal_calendar_subscription_token_unique ON personal_calendar_subscription(token_hash)"
    ).run();
    await expect(execute(contractSql)).rejects.toThrow();
    await env.DB.prepare(
      "ALTER TABLE personal_calendar_subscription ADD COLUMN unexpected TEXT"
    ).run();
    await expect(execute(contractSql)).rejects.toThrow();
  });
});
