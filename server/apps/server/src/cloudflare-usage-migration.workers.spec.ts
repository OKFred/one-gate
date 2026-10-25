import { env, reset } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../d1-migrations/0018_cloudflare_usage.sql?raw";
import metadataSql from "../d1-migrations/0019_cloudflare_usage_metadata.sql?raw";
import contractSql from "../d1-contract/cloudflare-usage.sql?raw";
import workerContractSql from "../d1-contract/worker-schema.sql?raw";
import {
  existingBusinessSql,
  existingMetadataSql,
  sqlStatements,
} from "../test/fixtures/enterprise-assets-migration";

async function execute(sql: string): Promise<void> {
  await env.DB.batch(
    sqlStatements(sql).map((statement) => env.DB.prepare(statement))
  );
}
beforeEach(async () => {
  await reset();
  await execute(existingBusinessSql + existingMetadataSql);
});
describe("Cloudflare usage migration on isolated D1", () => {
  it("shares the exact deployment contract and preserves existing data on repeated DDL", async () => {
    expect(
      workerContractSql.match(
        /-- cloudflare-usage-contract-start\s*([\s\S]*?)\s*-- cloudflare-usage-contract-end/
      )?.[1]
    ).toBe(contractSql.trim());
    await execute(migrationSql);
    await execute(metadataSql);
    await execute(migrationSql);
    await execute(metadataSql);
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
      (await env.DB.prepare("SELECT role_id FROM system_role_permission").all())
        .results
    ).toEqual([{ role_id: 1 }, { role_id: 1 }]);
    expect(
      await env.DB.prepare(
        "SELECT permission_count FROM system_role WHERE id=1"
      ).first("permission_count")
    ).toBe(2);
  });
  it("rolls back additive DDL on a conflicting index and detects altered schema", async () => {
    await env.DB.prepare(
      "CREATE INDEX cloudflare_usage_daily_retention_idx ON existing_business(value)"
    ).run();
    await expect(execute(migrationSql)).rejects.toThrow();
    expect(
      (
        await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'cloudflare_usage_%'"
        ).all()
      ).results
    ).toEqual([]);
    await env.DB.prepare(
      "DROP INDEX cloudflare_usage_daily_retention_idx"
    ).run();
    await execute(migrationSql);
    await env.DB.prepare(
      "ALTER TABLE cloudflare_usage_sync ADD COLUMN unexpected TEXT"
    ).run();
    await expect(execute(contractSql)).rejects.toThrow();
  });
});
