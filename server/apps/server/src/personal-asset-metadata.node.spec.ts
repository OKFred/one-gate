import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { existingMetadataSql } from "../test/fixtures/enterprise-assets-migration";

const migration = readFileSync(
  new URL("../d1-migrations/0024_personal_asset_metadata.sql", import.meta.url),
  "utf8"
);
const clients: Client[] = [];
afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});
async function database() {
  const client = createClient({ url: ":memory:" });
  clients.push(client);
  await client.executeMultiple(existingMetadataSql);
  await client.executeMultiple(`
    INSERT INTO system_permission(id,code,name,category,is_enabled,creator_id)
      VALUES (50,'existing:read','Keep','action',1,1);
    INSERT INTO system_role_permission(role_id,permission_id,creator_id) VALUES (9,50,1);
  `);
  return client;
}

describe("personal asset additive metadata", () => {
  it("adds only the feature and platform grants, preserves old rows and repeats safely", async () => {
    const client = await database();
    const originalMenu = (
      await client.execute("SELECT * FROM system_menu WHERE id=107")
    ).rows;
    const originalGrant = (
      await client.execute(
        "SELECT * FROM system_role_permission WHERE role_id=9"
      )
    ).rows;
    await client.executeMultiple(migration);
    await client.executeMultiple(migration);
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
  });

  it("refuses a colliding customized menu without granting permissions", async () => {
    const client = await database();
    await client.execute(
      "INSERT INTO system_menu(id,name,icon,sort,business,is_enabled,creator_id) VALUES(81,'custom','keep',0,'custom',1,1)"
    );
    await expect(client.executeMultiple(migration)).rejects.toThrow();
    expect(
      (await client.execute("SELECT business FROM system_menu WHERE id=81"))
        .rows[0].business
    ).toBe("custom");
    expect(
      (
        await client.execute(
          "SELECT id FROM system_permission WHERE code LIKE 'personal.asset:%'"
        )
      ).rows
    ).toEqual([]);
  });
});
