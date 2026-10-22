import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql, type SQL } from "drizzle-orm";
import {
  withPostgresDatabase,
  withPostgresTransaction,
  getPostgresDb,
  getPostgresSchema,
  validatePostgresSchema,
} from "@hodor/core/db/postgresql/runtime";

export const postgresTestsConfigured = Boolean(
  process.env.ONE_GATE_TEST_POSTGRES_URL
);

/** Destructive fixture lifecycle is restricted to a fresh schema on a loopback test server. */
export async function createPostgresTestHarness(label: string) {
  const connectionString = process.env.ONE_GATE_TEST_POSTGRES_URL;
  if (!connectionString)
    throw new Error(
      "ONE_GATE_TEST_POSTGRES_URL is required for PostgreSQL tests"
    );
  const target = new URL(connectionString);
  if (
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
  )
    throw new Error(
      "PostgreSQL fixture resets require a loopback test database"
    );
  if (!/^[a-z][a-z0-9_]{0,20}$/.test(label))
    throw new Error("Invalid PostgreSQL test schema label");
  const schema = validatePostgresSchema(
    `one_gate_${label}_${randomUUID().replaceAll("-", "").slice(0, 12)}`
  );
  const pool = new Pool({
    connectionString,
    application_name: schema,
    max: 5,
    connectionTimeoutMillis: 5000,
  });
  const database = drizzle(pool);
  const ddl = await readFile(
    new URL(
      "../postgresql-migrations/0001_core_enterprise.sql",
      import.meta.url
    ),
    "utf8"
  );
  const tables = [...ddl.matchAll(/^CREATE TABLE "([a-z0-9_]+)" \(/gm)].map(
    (match) => match[1]
  );
  if (tables.length < 20 || !tables.includes("one_gate_write_guard"))
    throw new Error("Incomplete PostgreSQL test DDL");
  let owned = false;
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}", pg_catalog`);
      await client.query(ddl);
      await client.query("COMMIT");
      owned = true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await pool.end();
    throw error;
  }
  return {
    schema,
    run<T>(operation: () => Promise<T>): Promise<T> {
      return withPostgresDatabase(database, schema, operation);
    },
    query<T extends Record<string, unknown> = Record<string, unknown>>(
      query: SQL,
      write = false
    ) {
      const operation = () =>
        withPostgresTransaction(
          async () => (await getPostgresDb().execute<T>(query)).rows,
          { write }
        );
      let activeSchema: string | undefined;
      try {
        activeSchema = getPostgresSchema();
      } catch {
        /* No enclosing database scope. */
      }
      if (activeSchema !== undefined && activeSchema !== schema)
        throw new Error(
          "PostgreSQL fixture scope belongs to a different schema"
        );
      return activeSchema === schema ? operation() : this.run(operation);
    },
    async reset() {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`SET LOCAL search_path TO "${schema}", pg_catalog`);
        await client.query(
          `TRUNCATE ${tables.map((table) => `"${schema}"."${table}"`).join(", ")} RESTART IDENTITY`
        );
        await client.query("INSERT INTO one_gate_write_guard(id) VALUES (1)");
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      try {
        // The only drop target is the exact freshly-created schema recorded above.
        if (owned) {
          await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
          owned = false;
        }
      } finally {
        await pool.end();
      }
    },
    async seedEnterpriseIdentities() {
      await this.query(
        sql`INSERT INTO system_role(id, name, is_enabled, permission_count, data_scope, creator_id, create_time_utc, is_deleted)
        VALUES (1, 'synthetic-platform', TRUE, 0, 'all', 1, 1, FALSE),
          (2, 'synthetic-enterprise-role', TRUE, 0, 'all', 1, 1, FALSE)`,
        true
      );
      const permissions = [
        "enterprise.tenant:read",
        "enterprise.tenant:add",
        "enterprise.tenant:edit",
        "enterprise.asset:read",
        "enterprise.asset:add",
        "enterprise.asset:edit",
        "enterprise.asset.mapping:read",
        "admin.system.role_permission:add",
      ];
      for (const [index, code] of permissions.entries()) {
        await this.query(
          sql`INSERT INTO system_permission(id,code,name,category,is_enabled,creator_id,create_time_utc)
            VALUES (${100 + index}, ${code}, ${code}, 'action', TRUE, 1, 1)`,
          true
        );
        await this.query(
          sql`INSERT INTO system_role_permission(role_id,permission_id,creator_id,create_time_utc)
            VALUES (2, ${100 + index}, 1, 1)`,
          true
        );
      }
      await this.query(
        sql`UPDATE system_role SET permission_count = ${permissions.length} WHERE id = 2`,
        true
      );
      for (const id of [1, 11, 12, 13, 14, 21, 31]) {
        await this.query(
          sql`INSERT INTO "system_user"(id, username, password, lang_code, role_id_arr, is_enabled, creator_id, create_time_utc)
          VALUES (${id}, ${`synthetic-pg-user-${id}`}, 'synthetic-hash-not-a-credential', 'en-US', ${JSON.stringify(id === 1 ? [1] : [2])}::jsonb, TRUE, 1, 1)`,
          true
        );
      }
      await this.query(
        sql`SELECT setval(pg_get_serial_sequence('"system_user"', 'id'), 31, TRUE),
        setval(pg_get_serial_sequence('system_role', 'id'), 2, TRUE),
        setval(pg_get_serial_sequence('system_permission', 'id'), ${100 + permissions.length - 1}, TRUE)`,
        true
      );
    },
  };
}

export type PostgresTestHarness = Awaited<
  ReturnType<typeof createPostgresTestHarness>
>;
