import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import metadataMigration from "../d1-migrations/0017_enterprise_asset_metadata.sql?raw";
import metadataContract from "../d1-contract/enterprise-assets-metadata.sql?raw";
import {
  existingMetadataSql,
  sqlStatements,
} from "../test/fixtures/enterprise-assets-migration";

async function execute(source: string) {
  const statements = source.includes("--> statement-breakpoint")
    ? source
        .split("--> statement-breakpoint")
        .map((part) => part.trim())
        .filter(Boolean)
    : sqlStatements(source);
  return env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));
}
beforeEach(async () => {
  await env.DB.batch(
    [
      "system_menu",
      "system_permission",
      "system_role_permission",
      "system_role",
      "i18n_translation",
    ].map((name) => env.DB.prepare(`DROP TABLE IF EXISTS ${name}`))
  );
  await execute(existingMetadataSql);
  await env.DB.prepare(
    "INSERT INTO system_menu(id,name,icon,sort,business,is_enabled,creator_id,create_time_utc) VALUES(26,'Enterprise','domain',4,'enterprise',1,1,100)"
  ).run();
  await execute(metadataMigration);
});

describe("read-only enterprise release metadata on real D1", () => {
  it("returns each required navigation, role, permission and grant without writes", async () => {
    const before = (
      await env.DB.prepare(
        "SELECT id,path,business,is_enabled FROM system_menu ORDER BY id"
      ).all()
    ).results;
    const result = await env.DB.prepare(metadataContract).all<{
      check_key: string;
      code: string;
    }>();
    expect(result.results).toHaveLength(17);
    expect(new Set(result.results.map((row) => row.check_key)).size).toBe(17);
    expect(result.results.every((row) => row.code === "READY")).toBe(true);
    expect(result.meta.changes).toBe(0);
    expect(
      (
        await env.DB.prepare(
          "SELECT id,path,business,is_enabled FROM system_menu ORDER BY id"
        ).all()
      ).results
    ).toEqual(before);
  });
  it("reports conflicts and disabled configuration without restoring or granting anything", async () => {
    await env.DB.batch([
      env.DB.prepare("UPDATE system_menu SET path='/custom' WHERE id=108"),
      env.DB.prepare(
        "UPDATE system_permission SET is_enabled=0 WHERE code='enterprise.asset:read'"
      ),
      env.DB.prepare(
        "DELETE FROM system_role_permission WHERE permission_id=(SELECT id FROM system_permission WHERE code='enterprise.asset:edit')"
      ),
    ]);
    const rows = (
      await env.DB.prepare(metadataContract).all<{
        check_key: string;
        code: string;
      }>()
    ).results;
    expect(rows.find((row) => row.check_key === "menu:108")?.code).toBe(
      "MENU_CONFLICT"
    );
    expect(
      rows.find((row) => row.check_key === "permission:enterprise.asset:read")
        ?.code
    ).toBe("PERMISSION_DISABLED");
    expect(
      rows.find((row) => row.check_key === "grant:enterprise.asset:edit")?.code
    ).toBe("ROLE_GRANT_MISSING");
    expect(
      await env.DB.prepare("SELECT path FROM system_menu WHERE id=108").first(
        "path"
      )
    ).toBe("/custom");
    expect(
      await env.DB.prepare(
        "SELECT is_enabled FROM system_permission WHERE code='enterprise.asset:read'"
      ).first("is_enabled")
    ).toBe(0);
  });
});
