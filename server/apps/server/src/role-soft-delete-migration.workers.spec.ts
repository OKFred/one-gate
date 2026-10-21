import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import migrationSql from "../d1-migrations/0015_role_soft_delete.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import preflightSql from "../d1-contract/role-soft-delete-preflight.sql?raw";
import workerSchemaSql from "../d1-contract/worker-schema.sql?raw";
import {
  invalidRoleMigrationFixtures,
  legacyRoleMigrationSql,
} from "../test/fixtures/role-migration";
import { prepareSuperAdminRole } from "@hodor/core/db/initUserAndRole";
import db from "@hodor/core/db/index";
import type { BatchItem } from "drizzle-orm/batch";

const statements = migrationSql
  .split("--> statement-breakpoint")
  .map((part) => part.trim())
  .filter(Boolean);
const roleContractMatch = workerSchemaSql.match(
  /-- role-soft-delete-contract-start\s*([\s\S]*?)\s*-- role-soft-delete-contract-end/
);
if (!roleContractMatch) throw new Error("Role deployment contract is missing");
const roleContractStatements = roleContractMatch[1]
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);
async function checkRoleContract(): Promise<void> {
  await env.DB.batch(
    roleContractStatements.map((statement) => env.DB.prepare(statement))
  );
}
async function createRoleSchema(schema: string): Promise<void> {
  await env.DB.prepare("DROP TABLE system_role").run();
  await env.DB.batch(
    schema
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean)
      .map((statement) => env.DB.prepare(statement))
  );
}
async function migrate(): Promise<void> {
  await env.DB.batch(statements.map((statement) => env.DB.prepare(statement)));
}
async function seedLegacyDatabase(): Promise<void> {
  await env.DB.batch([
    ...[
      "system_role",
      "system_user",
      "system_department",
      "system_role_permission",
      "conflicting_index_owner",
    ].map((table) => env.DB.prepare(`DROP TABLE IF EXISTS ${table}`)),
    ...legacyRoleMigrationSql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((statement) => env.DB.prepare(statement)),
  ]);
}

describe("role migration on real local D1", () => {
  beforeEach(seedLegacyDatabase);

  it("validates the migrated role contract without writing data or schema", async () => {
    await migrate();
    const before = await env.DB.prepare("SELECT * FROM system_role").all();
    const objectsBefore = await env.DB.prepare(
      "SELECT type,name,sql FROM sqlite_master ORDER BY name"
    ).all();
    await checkRoleContract();
    expect(
      (await env.DB.prepare("SELECT * FROM system_role").all()).results
    ).toEqual(before.results);
    expect(
      (
        await env.DB.prepare(
          "SELECT type,name,sql FROM sqlite_master ORDER BY name"
        ).all()
      ).results
    ).toEqual(objectsBefore.results);
  });

  it("validates a fresh role schema contract", async () => {
    await createRoleSchema(roleSql);
    await checkRoleContract();
  });

  it.each([
    {
      defect: "missing state CHECK",
      schema: roleSql.replace(
        /,\s*CONSTRAINT "system_role_soft_delete_state_check" CHECK[^\n]+/,
        ""
      ),
    },
    {
      defect: "permissive state CHECK",
      schema: roleSql.replace(/CHECK\([^\n]+/, "CHECK(1)"),
    },
    {
      defect: "nullable deletion flag",
      schema: roleSql.replace(
        "`is_deleted` integer NOT NULL",
        "`is_deleted` integer"
      ),
    },
    {
      defect: "non-null deleted timestamp",
      schema: roleSql.replace(
        "`deleted_time_utc` integer,",
        "`deleted_time_utc` integer NOT NULL,"
      ),
    },
    {
      defect: "database deletion default",
      schema: roleSql.replace(
        "`is_deleted` integer NOT NULL",
        "`is_deleted` integer DEFAULT 0 NOT NULL"
      ),
    },
    {
      defect: "incorrect deletion type",
      schema: roleSql.replace(
        "`is_deleted` integer NOT NULL",
        "`is_deleted` text NOT NULL"
      ),
    },
    {
      defect: "global name unique index",
      schema: roleSql.replace(' WHERE "system_role"."is_deleted" = 0', ""),
    },
    {
      defect: "non-unique name index",
      schema: roleSql.replace("CREATE UNIQUE INDEX", "CREATE INDEX"),
    },
    {
      defect: "wrong cleanup index columns",
      schema: roleSql.replace(
        "(`is_deleted`,`deleted_time_utc`)",
        "(`deleted_time_utc`,`is_deleted`)"
      ),
    },
  ])("rejects $defect with a read-only contract error", async ({ schema }) => {
    await createRoleSchema(schema);
    await expect(checkRoleContract()).rejects.toThrow("malformed JSON");
    expect(
      await env.DB.prepare("SELECT COUNT(*) FROM system_role").first("COUNT(*)")
    ).toBe(0);
  });

  it("swaps atomically, preserving all columns, IDs, bindings and sequence high water", async () => {
    await migrate();
    expect(
      await env.DB.prepare("SELECT * FROM system_role WHERE id=2").first()
    ).toEqual({
      id: 2,
      name: "Keep",
      remark: "original",
      is_enabled: 0,
      permission_count: 1,
      data_scope: "custom",
      custom_dept_ids: "[7]",
      creator_id: 7,
      updater_id: 8,
      create_time_utc: 100,
      update_time_utc: 101,
      is_deleted: 0,
      deleted_time_utc: null,
      deleter_id: null,
    });
    expect(
      (await env.DB.prepare("SELECT * FROM system_role_permission").all())
        .results
    ).toEqual([
      {
        id: 30,
        role_id: 2,
        permission_id: 20,
        creator_id: 7,
        updater_id: 8,
        create_time_utc: 100,
        update_time_utc: 101,
      },
    ]);
    expect(
      await env.DB.prepare(
        "SELECT seq FROM sqlite_sequence WHERE name='system_role'"
      ).first("seq")
    ).toBe(900);
    await env.DB.prepare(
      "UPDATE system_role SET is_deleted=1,deleted_time_utc=200,deleter_id=7 WHERE id=2"
    ).run();
    const inserted = await env.DB.prepare(
      "INSERT INTO system_role (name,is_enabled,permission_count,data_scope,creator_id,is_deleted) VALUES ('Keep',1,0,'all',1,0) RETURNING id"
    ).first<{ id: number }>();
    expect(inserted?.id).toBeGreaterThan(900);
    await expect(
      env.DB.prepare(
        "UPDATE system_role SET is_deleted=0,deleted_time_utc=NULL,deleter_id=NULL WHERE id=2"
      ).run()
    ).rejects.toThrow();
  });

  it("has no new defaults and enforces a consistent deletion state", async () => {
    await migrate();
    const columns = (
      await env.DB.prepare("PRAGMA table_info(system_role)").all<{
        name: string;
        dflt_value: unknown;
        notnull: number;
      }>()
    ).results;
    for (const name of ["is_deleted", "deleted_time_utc", "deleter_id"])
      expect(
        columns.find((column) => column.name === name)?.dflt_value
      ).toBeNull();
    await expect(
      env.DB.prepare(
        "INSERT INTO system_role (name,is_enabled,permission_count,data_scope,creator_id) VALUES ('Missing',1,0,'all',1)"
      ).run()
    ).rejects.toThrow();
    for (const mutation of [
      "is_deleted=1",
      "is_deleted=2",
      "deleter_id=1",
      "deleted_time_utc=200",
    ])
      await expect(
        env.DB.prepare(`UPDATE system_role SET ${mutation} WHERE id=2`).run()
      ).rejects.toThrow();
  });

  it.each(invalidRoleMigrationFixtures)(
    "rejects $issue without changing old data or schema",
    async ({ sql, issue }) => {
      await env.DB.prepare(sql).run();
      expect(
        (await env.DB.prepare(preflightSql).first<Record<string, number>>())?.[
          issue
        ]
      ).toBe(1);
      const before = (await env.DB.prepare("SELECT * FROM system_role").all())
        .results;
      const bindings = (
        await env.DB.prepare("SELECT * FROM system_role_permission").all()
      ).results;
      await expect(migrate()).rejects.toThrow();
      const columns = (
        await env.DB.prepare("PRAGMA table_info(system_role)").all<{
          name: string;
        }>()
      ).results;
      expect(columns.map((column) => column.name)).not.toContain("is_deleted");
      expect(
        (await env.DB.prepare("SELECT * FROM system_role").all()).results
      ).toEqual(before);
      expect(
        (await env.DB.prepare("SELECT * FROM system_role_permission").all())
          .results
      ).toEqual(bindings);
      expect(
        (
          await env.DB.prepare(
            "SELECT name FROM sqlite_master WHERE name LIKE '_role_soft_delete_%'"
          ).all()
        ).results
      ).toHaveLength(0);
    }
  );

  it("rolls back a late failure after the swap and restores old data and sequence", async () => {
    await env.DB.batch([
      env.DB.prepare("CREATE TABLE conflicting_index_owner (id INTEGER)"),
      env.DB.prepare(
        "CREATE INDEX system_role_deleted_time_idx ON conflicting_index_owner(id)"
      ),
    ]);
    await expect(migrate()).rejects.toThrow();
    const columns = (
      await env.DB.prepare("PRAGMA table_info(system_role)").all<{
        name: string;
      }>()
    ).results;
    expect(columns.map((column) => column.name)).not.toContain("is_deleted");
    expect(
      await env.DB.prepare(
        "SELECT name,remark FROM system_role WHERE id=2"
      ).first()
    ).toEqual({ name: "Keep", remark: "original" });
    expect(
      await env.DB.prepare(
        "SELECT seq FROM sqlite_sequence WHERE name='system_role'"
      ).first("seq")
    ).toBe(900);
    expect(
      (
        await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE name IN ('__new_system_role','_role_soft_delete_sequence')"
        ).all()
      ).results
    ).toHaveLength(0);
    expect(
      await env.DB.prepare(
        "SELECT role_id FROM system_role_permission WHERE id=30"
      ).first("role_id")
    ).toBe(2);
  });

  it("retains the high water for an empty previously populated table", async () => {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM system_user"),
      env.DB.prepare("DELETE FROM system_role_permission"),
      env.DB.prepare("DELETE FROM system_role"),
    ]);
    await migrate();
    expect(
      (
        await env.DB.prepare(
          "INSERT INTO system_role (name,is_enabled,permission_count,data_scope,creator_id,is_deleted) VALUES ('First',1,0,'all',1,0) RETURNING id"
        ).first<{ id: number }>()
      )?.id
    ).toBeGreaterThan(900);
  });

  it("initializes a fresh D1 schema and synchronizes the protected role explicitly", async () => {
    await env.DB.prepare("DROP TABLE system_role").run();
    await env.DB.batch(
      roleSql
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((statement) => env.DB.prepare(statement))
    );
    const first = await prepareSuperAdminRole();
    await db.batch(
      first.queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]
    );
    expect(
      await env.DB.prepare(
        "SELECT id,is_deleted,deleted_time_utc,deleter_id FROM system_role WHERE id=1"
      ).first()
    ).toEqual({
      id: 1,
      is_deleted: 0,
      deleted_time_utc: null,
      deleter_id: null,
    });
    await env.DB.prepare(
      "UPDATE system_role SET is_deleted=1,deleted_time_utc=200,deleter_id=7 WHERE id=1"
    ).run();
    const sync = await prepareSuperAdminRole();
    await db.batch(
      sync.queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]
    );
    expect(
      await env.DB.prepare(
        "SELECT is_deleted,deleted_time_utc,deleter_id FROM system_role WHERE id=1"
      ).first()
    ).toEqual({ is_deleted: 0, deleted_time_utc: null, deleter_id: null });
  });
});
