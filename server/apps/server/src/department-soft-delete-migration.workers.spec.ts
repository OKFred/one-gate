import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../d1-migrations/0013_department_soft_delete.sql?raw";

const statements = migrationSql
  .split("--> statement-breakpoint")
  .map((statement) => statement.trim())
  .filter(Boolean);

async function seedLegacyDatabase() {
  await env.DB.batch([
    env.DB.prepare("DROP TABLE IF EXISTS system_department"),
    env.DB.prepare("DROP TABLE IF EXISTS compliance_archives"),
    env.DB.prepare(
      "CREATE TABLE system_department (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, name TEXT NOT NULL, parent_id INTEGER, remark TEXT, is_enabled INTEGER NOT NULL, creator_id INTEGER NOT NULL, updater_id INTEGER, create_time_utc INTEGER NOT NULL, update_time_utc INTEGER)"
    ),
    env.DB.prepare(
      "CREATE UNIQUE INDEX system_department_name_unique ON system_department(name)"
    ),
    env.DB.prepare(
      "CREATE TABLE compliance_archives (id INTEGER PRIMARY KEY AUTOINCREMENT, source_system TEXT, source_database TEXT, source_table TEXT, create_time_utc INTEGER)"
    ),
    env.DB.prepare(
      "INSERT INTO system_department VALUES (1,'Keep',NULL,'original',1,7,NULL,100,NULL)"
    ),
    env.DB.prepare(
      "INSERT INTO system_department VALUES (900,'Removed',NULL,NULL,1,7,NULL,100,NULL)"
    ),
    env.DB.prepare("DELETE FROM system_department WHERE id=900"),
  ]);
}

describe("department migration on D1", () => {
  beforeEach(seedLegacyDatabase);

  it("executes the complete table swap atomically and preserves sequence and checks", async () => {
    await env.DB.batch(
      statements.map((statement) => env.DB.prepare(statement))
    );
    expect(
      await env.DB.prepare(
        "SELECT is_deleted,deleted_time_utc,deleter_id,remark FROM system_department WHERE id=1"
      ).first()
    ).toEqual({
      is_deleted: 0,
      deleted_time_utc: null,
      deleter_id: null,
      remark: "original",
    });
    await expect(
      env.DB.prepare(
        "UPDATE system_department SET is_deleted=1 WHERE id=1"
      ).run()
    ).rejects.toThrow();
    await env.DB.prepare(
      "UPDATE system_department SET is_deleted=1,deleted_time_utc=200,deleter_id=7 WHERE id=1"
    ).run();
    const inserted = await env.DB.prepare(
      "INSERT INTO system_department (name,is_enabled,creator_id,is_deleted) VALUES ('Keep',1,1,0) RETURNING id"
    ).first<{ id: number }>();
    expect(inserted?.id).toBeGreaterThan(900);
  });

  it("rolls back the old data and schema when the final index creation fails", async () => {
    await env.DB.prepare("DROP TABLE compliance_archives").run();
    await expect(
      env.DB.batch(statements.map((statement) => env.DB.prepare(statement)))
    ).rejects.toThrow();
    const columns = await env.DB.prepare(
      "PRAGMA table_info(system_department)"
    ).all<{ name: string }>();
    expect(columns.results.map((column) => column.name)).not.toContain(
      "is_deleted"
    );
    expect(
      await env.DB.prepare(
        "SELECT remark FROM system_department WHERE id=1"
      ).first("remark")
    ).toBe("original");
  });
});
