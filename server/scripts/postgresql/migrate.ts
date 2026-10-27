import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Client } from "pg";
import { getTableConfig } from "drizzle-orm/pg-core";
import { validatePostgresSchema } from "../../packages/core/src/db/postgresql/runtime";
import { verifiedPostgresConnection } from "../../packages/core/src/db/postgresql/connection";
import { postgresTables, postgresTableNames } from "./generate";

export type PostgresMigrationClient = Pick<Client, "query">;
export const postgresMigrationId = "0001_core_enterprise";
export const postgresMigrationSql = readFileSync(
  new URL(
    "../../apps/server/postgresql-migrations/0001_core_enterprise.sql",
    import.meta.url
  ),
  "utf8"
);
export const postgresMigrationChecksum = createHash("sha256")
  .update(postgresMigrationSql)
  .digest("hex");
const cloudflareMigrationId = "0002_cloudflare_usage";
const cloudflareMigrationSql = readFileSync(
  new URL(
    "../../apps/server/postgresql-migrations/0002_cloudflare_usage.sql",
    import.meta.url
  ),
  "utf8"
);
const cloudflareMigrationChecksum = createHash("sha256")
  .update(cloudflareMigrationSql)
  .digest("hex");
const calendarMigrationId = "0003_personal_calendar";
const calendarMigrationSql = readFileSync(
  new URL(
    "../../apps/server/postgresql-migrations/0003_personal_calendar.sql",
    import.meta.url
  ),
  "utf8"
);
const calendarMigrationChecksum = createHash("sha256")
  .update(calendarMigrationSql)
  .digest("hex");
const subscriptionMigrationId = "0004_personal_calendar_subscription";
const subscriptionMigrationSql = readFileSync(
  new URL(
    "../../apps/server/postgresql-migrations/0004_personal_calendar_subscription.sql",
    import.meta.url
  ),
  "utf8"
);
const subscriptionMigrationChecksum = createHash("sha256")
  .update(subscriptionMigrationSql)
  .digest("hex");

function migrationTableNames(sql: string): string[] {
  return [...sql.matchAll(/^CREATE TABLE "([a-z0-9_]+)" \(/gm)]
    .map((match) => match[1])
    .sort();
}

/** Earlier SQL, checksums and contract fingerprints remain immutable. */
export const postgresMigrations = [
  {
    id: postgresMigrationId,
    sql: postgresMigrationSql,
    checksum: postgresMigrationChecksum,
    tableNames: migrationTableNames(postgresMigrationSql),
  },
  {
    id: cloudflareMigrationId,
    sql: cloudflareMigrationSql,
    checksum: cloudflareMigrationChecksum,
    tableNames: [
      ...migrationTableNames(postgresMigrationSql),
      ...migrationTableNames(cloudflareMigrationSql),
    ].sort(),
  },
  {
    id: calendarMigrationId,
    sql: calendarMigrationSql,
    checksum: calendarMigrationChecksum,
    tableNames: [
      ...migrationTableNames(postgresMigrationSql),
      ...migrationTableNames(cloudflareMigrationSql),
      ...migrationTableNames(calendarMigrationSql),
    ].sort(),
  },
  {
    id: subscriptionMigrationId,
    sql: subscriptionMigrationSql,
    checksum: subscriptionMigrationChecksum,
    tableNames: [
      ...migrationTableNames(postgresMigrationSql),
      ...migrationTableNames(cloudflareMigrationSql),
      ...migrationTableNames(calendarMigrationSql),
      ...migrationTableNames(subscriptionMigrationSql),
    ].sort(),
  },
] as const;

const ledger = "_one_gate_pg_migrations";

interface CatalogEntry {
  kind: string;
  name: string;
  definition: string;
}

/** Fingerprint structural metadata only; never read business row contents. */
export async function postgresCatalogFingerprint(
  client: PostgresMigrationClient,
  schema: string
): Promise<string> {
  validatePostgresSchema(schema);
  const { rows } = await client.query<CatalogEntry>(
    `
    SELECT 'table'::text AS kind, c.relname::text AS name,
      concat_ws('|',c.relkind,c.relpersistence,c.relrowsecurity,c.relforcerowsecurity) AS definition
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=$1 AND c.relkind IN ('r','p') AND c.relname<>$2
    UNION ALL
    SELECT 'column', c.relname||'.'||a.attname,
      concat_ws('|',format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,
        coalesce(pg_get_expr(d.adbin,d.adrelid),''))
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname=$1 AND c.relkind IN ('r','p') AND c.relname<>$2 AND a.attnum>0 AND NOT a.attisdropped
    UNION ALL
    SELECT 'constraint', c.relname||'.'||co.conname,
      concat_ws('|',co.contype,co.convalidated,co.condeferrable,co.condeferred,pg_get_constraintdef(co.oid,true))
    FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=$1 AND c.relname<>$2
    UNION ALL
    SELECT 'index',i.relname,
      concat_ws('|',ix.indisunique,ix.indisprimary,ix.indisvalid,ix.indisready,pg_get_indexdef(i.oid))
    FROM pg_index ix JOIN pg_class i ON i.oid=ix.indexrelid JOIN pg_class c ON c.oid=ix.indrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=$1 AND c.relname<>$2
    UNION ALL
    SELECT 'sequence',c.relname,
      concat_ws('|',s.seqstart,s.seqincrement,s.seqmin,s.seqmax,s.seqcache,s.seqcycle)
    FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=$1`,
    [schema, ledger]
  );
  const canonical = rows
    .map((entry) => {
      if (
        typeof entry.kind !== "string" ||
        typeof entry.name !== "string" ||
        typeof entry.definition !== "string"
      )
        throw new Error("Invalid PostgreSQL catalog response");
      return JSON.stringify([entry.kind, entry.name, entry.definition]);
    })
    .sort()
    .join("\n");
  return createHash("sha256").update(canonical).digest("hex");
}

export async function assertPostgresSchema(
  client: PostgresMigrationClient,
  schema: string,
  tableNames: readonly string[] = postgresTableNames
): Promise<void> {
  validatePostgresSchema(schema);
  const tables = await client.query<{ name: string }>(
    `SELECT c.relname AS name FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind IN ('r','p') AND c.relname<>$2`,
    [schema, ledger]
  );
  if (
    tables.rows
      .map((row) => row.name)
      .sort()
      .join("\n") !== tableNames.join("\n")
  )
    throw new Error("PostgreSQL supported table set does not match");
  const actual = await client.query<{
    table_name: string;
    name: string;
    type: string;
    not_null: boolean;
    identity: string;
    default_value: string | null;
  }>(
    `
    SELECT c.relname AS table_name,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
      a.attnotnull AS not_null,a.attidentity AS identity,pg_get_expr(d.adbin,d.adrelid) AS default_value
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname=$1 AND c.relkind IN ('r','p') AND c.relname<>$2 AND a.attnum>0 AND NOT a.attisdropped`,
    [schema, ledger]
  );
  const expected = postgresTables.flatMap((table) => {
    const config = getTableConfig(table);
    if (!tableNames.includes(config.name)) return [];
    return config.columns.map((column) => ({ table: config.name, column }));
  });
  if (actual.rows.length !== expected.length)
    throw new Error("PostgreSQL supported column count does not match");
  for (const { table, column } of expected) {
    const found = actual.rows.find(
      (row) => row.table_name === table && row.name === column.name
    );
    if (
      !found ||
      found.type !== column.getSQLType() ||
      found.not_null !== column.notNull ||
      !!found.identity !== !!column.generatedIdentity
    )
      throw new Error("PostgreSQL column contract mismatch");
    if (
      found.default_value !== null &&
      column.name !== "create_time_utc" &&
      !found.identity
    )
      throw new Error("Unexpected PostgreSQL business default");
  }
  const invalid = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM pg_constraint co
    JOIN pg_namespace n ON n.oid=co.connamespace WHERE n.nspname=$1 AND NOT co.convalidated`,
    [schema]
  );
  if (invalid.rows[0]?.count !== "0")
    throw new Error("Unvalidated PostgreSQL constraint");
  const outside = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM pg_constraint co
    JOIN pg_namespace own ON own.oid=co.connamespace JOIN pg_class target ON target.oid=co.confrelid
    JOIN pg_namespace other ON other.oid=target.relnamespace WHERE co.contype='f' AND own.nspname=$1 AND other.nspname<>$1`,
    [schema]
  );
  if (outside.rows[0]?.count !== "0")
    throw new Error("PostgreSQL foreign key points outside application schema");
  const guard = await client.query<{ id: number }>(
    `SELECT id FROM one_gate_write_guard`
  );
  if (guard.rows.length !== 1 || guard.rows[0].id !== 1)
    throw new Error("PostgreSQL write guard is not initialized");
}

export type PostgresMigrationStatus = "pending" | "applied" | "already_applied";

/** Apply an ordered migration prefix atomically to an explicitly named schema. */
export async function migratePostgres(
  client: PostgresMigrationClient,
  options: { schema: string; apply?: boolean }
): Promise<PostgresMigrationStatus> {
  const schema = validatePostgresSchema(options.schema);
  await client.query(options.apply ? "BEGIN" : "BEGIN READ ONLY");
  try {
    await client.query("SET LOCAL statement_timeout='30s'");
    if (options.apply)
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`one-gate:migration:${schema}`]
      );
    const namespace = await client.query<{ present: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname=$1) AS present",
      [schema]
    );
    if (!namespace.rows[0]?.present) {
      if (!options.apply) {
        await client.query("COMMIT");
        return "pending";
      }
      await client.query(`CREATE SCHEMA "${schema}"`);
    }
    await client.query(`SET LOCAL search_path TO "${schema}", pg_catalog`);
    const entries = await client.query<{ name: string }>(
      `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=$1 AND c.relkind IN ('r','p')`,
      [schema]
    );
    const hasLedger = entries.rows.some((row) => row.name === ledger);
    let appliedCount = 0;
    if (hasLedger) {
      const prior = await client.query<{
        id: string;
        checksum: string;
        contract_checksum: string;
      }>(`SELECT id,checksum,contract_checksum FROM ${ledger} ORDER BY id`);
      for (const [index, recorded] of prior.rows.entries()) {
        const expected = postgresMigrations[index];
        if (!expected || recorded.id !== expected.id)
          throw new Error(
            "PostgreSQL migration ledger is not an ordered known prefix"
          );
        if (recorded.checksum !== expected.checksum)
          throw new Error("PostgreSQL migration checksum mismatch");
      }
      appliedCount = prior.rows.length;
      if (prior.rows.length) {
        // Validate the previous stage before any DDL or assertion of new tables.
        if (
          prior.rows[appliedCount - 1].contract_checksum !==
          (await postgresCatalogFingerprint(client, schema))
        )
          throw new Error("PostgreSQL schema fingerprint mismatch");
      }
    }
    if (appliedCount === postgresMigrations.length) {
      await assertPostgresSchema(client, schema);
      await client.query("COMMIT");
      return "already_applied";
    }
    if (!appliedCount && entries.rows.some((row) => row.name !== ledger))
      throw new Error("PostgreSQL schema has unmarked existing tables");
    if (!options.apply) {
      await client.query("COMMIT");
      return "pending";
    }
    await client.query(`CREATE TABLE IF NOT EXISTS ${ledger} (
      id text PRIMARY KEY NOT NULL, checksum text NOT NULL, contract_checksum text NOT NULL, applied_time_utc bigint NOT NULL
    )`);
    for (const migration of postgresMigrations.slice(appliedCount)) {
      await client.query(migration.sql);
      await assertPostgresSchema(client, schema, migration.tableNames);
      const fingerprint = await postgresCatalogFingerprint(client, schema);
      await client.query(
        `INSERT INTO ${ledger} (id,checksum,contract_checksum,applied_time_utc) VALUES ($1,$2,$3,$4)`,
        [migration.id, migration.checksum, fingerprint, Date.now()]
      );
    }
    await assertPostgresSchema(client, schema);
    await client.query("COMMIT");
    return "applied";
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export function postgresToolOptions(args: string[]) {
  let apply = false;
  let schema: string | undefined = process.env.PG_SCHEMA;
  const seen = new Set<string>();
  for (const arg of args) {
    const key = arg.split("=", 1)[0];
    if (seen.has(key)) throw new Error("Duplicate PostgreSQL tool argument");
    seen.add(key);
    if (arg === "--apply") apply = true;
    else if (arg.startsWith("--schema="))
      schema = arg.slice("--schema=".length);
    else
      throw new Error(
        "Use --schema=<one_gate application schema> and optional --apply"
      );
  }
  if (!schema) throw new Error("An explicit PG_SCHEMA or --schema is required");
  return { schema: validatePostgresSchema(schema), apply };
}

/** Connection strings stay in process environment; remote tools require verified TLS. */
export function createPostgresToolClient() {
  const connection = process.env.DATABASE_URL;
  if (!connection) throw new Error("A private DATABASE_URL is required");
  return new Client({
    ...verifiedPostgresConnection(
      connection,
      process.env.PG_SSL_CA_FILE
        ? readFileSync(process.env.PG_SSL_CA_FILE, "utf8")
        : undefined
    ),
    connectionTimeoutMillis: 10_000,
    application_name: "one-gate-schema-tools",
  });
}

async function main() {
  const options = postgresToolOptions(process.argv.slice(2));
  const client = createPostgresToolClient();
  try {
    await client.connect();
    console.log(
      JSON.stringify({
        schema: options.schema,
        mode: options.apply ? "apply" : "check",
        status: await migratePostgres(client, options),
      })
    );
  } finally {
    await client.end();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch(() => {
    console.error(
      "PostgreSQL migration/check did not complete; no credentials or database records logged"
    );
    process.exitCode = 1;
  });
}
