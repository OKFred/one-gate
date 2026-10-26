import { env, reset } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../d1-migrations/0020_personal_calendar.sql?raw";
import contractSql from "../d1-contract/personal-calendar.sql?raw";
import workerContractSql from "../d1-contract/worker-schema.sql?raw";
import {
  existingBusinessSql,
  sqlStatements,
} from "../test/fixtures/enterprise-assets-migration";

async function execute(sql: string): Promise<void> {
  await env.DB.batch(
    sqlStatements(sql).map((statement) => env.DB.prepare(statement))
  );
}
beforeEach(async () => {
  await reset();
  await execute(existingBusinessSql);
});
describe("personal calendar migration on isolated D1", () => {
  it("uses the exact deployment contract, preserves data and tolerates repeated DDL", async () => {
    expect(
      workerContractSql.match(
        /-- personal-calendar-contract-start\s*([\s\S]*?)\s*-- personal-calendar-contract-end/
      )?.[1]
    ).toBe(contractSql.trim());
    await execute(migrationSql);
    await execute(migrationSql);
    await execute(contractSql);
    expect(
      (await env.DB.prepare("SELECT * FROM existing_business").all()).results
    ).toEqual([{ id: 7, value: "unchanged" }]);
    expect(
      await env.DB.prepare(
        "SELECT seq FROM sqlite_sequence WHERE name='existing_business'"
      ).first("seq")
    ).toBe(900);
    expect(
      (await env.DB.prepare("SELECT * FROM personal_calendar_event").all())
        .results
    ).toEqual([]);
  });
  it("rolls back additive DDL on a conflicting index and can retry after correction", async () => {
    await env.DB.prepare(
      "CREATE INDEX personal_calendar_event_owner_start_idx ON existing_business(value)"
    ).run();
    await expect(execute(migrationSql)).rejects.toThrow();
    expect(
      await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE name='personal_calendar_event'"
      ).first("name")
    ).toBeNull();
    expect(
      (await env.DB.prepare("SELECT * FROM existing_business").all()).results
    ).toEqual([{ id: 7, value: "unchanged" }]);
    await env.DB.prepare(
      "DROP INDEX personal_calendar_event_owner_start_idx"
    ).run();
    await execute(migrationSql);
    await execute(contractSql);
  });
  it("detects altered columns and omitted partial reminder-index predicate", async () => {
    await execute(migrationSql);
    await env.DB.prepare(
      "DROP INDEX personal_calendar_event_owner_reminder_idx"
    ).run();
    await env.DB.prepare(
      "CREATE INDEX personal_calendar_event_owner_reminder_idx ON personal_calendar_event(owner_user_id,reminder_time_utc,id)"
    ).run();
    await expect(execute(contractSql)).rejects.toThrow();
    await env.DB.prepare(
      "ALTER TABLE personal_calendar_event ADD COLUMN unexpected TEXT"
    ).run();
    await expect(execute(contractSql)).rejects.toThrow();
  });
  it.each(["ACTIVE", "active "])(
    "rejects changed CHECK string literal: %s",
    async (status) => {
      const ddl = migrationSql.slice(0, migrationSql.indexOf("-- Read-only"));
      await execute(
        ddl.replace(
          "IN ('active', 'cancelled')",
          `IN ('${status}', 'cancelled')`
        )
      );
      await expect(execute(contractSql)).rejects.toThrow();
    }
  );
});
