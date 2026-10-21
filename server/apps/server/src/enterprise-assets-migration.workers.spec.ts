import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../d1-migrations/0016_enterprise_assets.sql?raw";
import metadataSql from "../d1-migrations/0017_enterprise_asset_metadata.sql?raw";
import contractSql from "../d1-contract/enterprise-assets.sql?raw";
import workerSchemaSql from "../d1-contract/worker-schema.sql?raw";
import {
  existingBusinessSql,
  existingMetadataSql,
  invalidEnterpriseSchemas,
  sqlStatements,
  tenantFixtureSql,
} from "../test/fixtures/enterprise-assets-migration";

async function execute(sql: string) {
  return env.DB.batch(
    sqlStatements(sql).map((statement) => env.DB.prepare(statement))
  );
}
beforeEach(async () => {
  await env.DB.batch(
    [
      "enterprise_asset_assignment",
      "enterprise_asset_identifier",
      "enterprise_asset_measurement_binding",
      "enterprise_asset",
      "enterprise_tenant_member",
      "enterprise_tenant_api_token_grant",
      "enterprise_tenant",
      "existing_business",
      "system_menu",
      "system_permission",
      "system_role_permission",
      "system_role",
      "i18n_translation",
    ].map((table) => env.DB.prepare(`DROP TABLE IF EXISTS ${table}`))
  );
  await execute(existingBusinessSql);
  await execute(existingMetadataSql);
});
describe("enterprise asset migration on real local D1", () => {
  it("shares the exact standalone read-only deployment contract", () => {
    expect(
      workerSchemaSql.match(
        /-- enterprise-assets-contract-start\s*([\s\S]*?)\s*-- enterprise-assets-contract-end/
      )?.[1]
    ).toBe(contractSql.trim());
  });
  it("adds seven tables and validates without changing existing data or sequence", async () => {
    await execute(migrationSql);
    const before = (
      await env.DB.prepare(
        "SELECT type,name,sql FROM sqlite_master ORDER BY name"
      ).all()
    ).results;
    await execute(contractSql);
    expect(
      (
        await env.DB.prepare(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        ).all()
      ).results
    ).toEqual(before);
    expect(
      (await env.DB.prepare("SELECT * FROM existing_business").all()).results
    ).toEqual([{ id: 7, value: "unchanged" }]);
    expect(
      await env.DB.prepare(
        "SELECT seq FROM sqlite_sequence WHERE name='existing_business'"
      ).first("seq")
    ).toBe(900);
  });
  it("rolls back the whole migration after a late index conflict", async () => {
    await env.DB.prepare(
      "CREATE INDEX enterprise_asset_tenant_status_idx ON existing_business(value)"
    ).run();
    await expect(execute(migrationSql)).rejects.toThrow();
    expect(
      (
        await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'enterprise_%'"
        ).all()
      ).results
    ).toHaveLength(0);
    expect(
      await env.DB.prepare(
        "SELECT value FROM existing_business WHERE id=7"
      ).first("value")
    ).toBe("unchanged");
  });
  it("rejects cross-enterprise host foreign keys", async () => {
    await execute(migrationSql);
    await execute(tenantFixtureSql);
    await expect(
      env.DB.prepare(
        "INSERT INTO enterprise_asset_assignment(tenant_id,asset_id,host_asset_id,location,valid_from_utc,valid_to_utc,reason,creator_id,create_time_utc) VALUES(1,1,2,'cross-tenant',100,NULL,'invalid',10,100)"
      ).run()
    ).rejects.toThrow("FOREIGN KEY");
  });
  it("seeds metadata idempotently without changing old menus or granting ordinary roles", async () => {
    const statements = metadataSql
      .split("--> statement-breakpoint")
      .map((part) => part.trim())
      .filter(Boolean);
    await env.DB.batch(
      statements.map((statement) => env.DB.prepare(statement))
    );
    await env.DB.batch(
      statements.map((statement) => env.DB.prepare(statement))
    );
    expect(
      await env.DB.prepare("SELECT name FROM system_menu WHERE id=107").first(
        "name"
      )
    ).toBe("Existing recycle bin");
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM system_menu WHERE id IN (108,109)"
      ).first("n")
    ).toBe(2);
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM system_role_permission"
      ).first("n")
    ).toBe(7);
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM system_role_permission WHERE role_id<>1"
      ).first("n")
    ).toBe(0);
  });
  it("rolls back metadata on a reserved menu collision", async () => {
    await env.DB.prepare(
      "INSERT INTO system_menu(id,name,icon,sort,business,is_enabled,creator_id) VALUES(109,'Custom','keep',1,'custom',1,1)"
    ).run();
    await expect(
      env.DB.batch(
        metadataSql
          .split("--> statement-breakpoint")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((statement) => env.DB.prepare(statement))
      )
    ).rejects.toThrow();
    expect(
      await env.DB.prepare("SELECT name FROM system_menu WHERE id=109").first(
        "name"
      )
    ).toBe("Custom");
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM system_menu WHERE id=108"
      ).first("n")
    ).toBe(0);
  });
  it.each(invalidEnterpriseSchemas)(
    "rejects $defect in the deployment contract",
    async ({ change }) => {
      expect(change(migrationSql)).not.toBe(migrationSql);
      await execute(change(migrationSql));
      await expect(execute(contractSql)).rejects.toThrow("malformed JSON");
    }
  );
});
