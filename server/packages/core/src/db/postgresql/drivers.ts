import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { withPostgresDatabase, validatePostgresSchema } from "./runtime";
import {
  parsePostgresConnection,
  verifiedPostgresConnection,
} from "./connection";

type PostgresConfiguration = {
  readonly connectionString: string;
  readonly schema: string;
  readonly ca?: string;
};

export function createNodePostgresRuntime(
  configuration: PostgresConfiguration
) {
  const schema = validatePostgresSchema(configuration.schema);
  const pool = new Pool({
    ...verifiedPostgresConnection(
      configuration.connectionString,
      configuration.ca
    ),
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: "one-gate",
  });
  // pg emits idle-client failures; never print connection strings or driver detail.
  pool.on("error", () => {
    console.error(
      JSON.stringify({
        event: "postgresql.pool_error",
        code: "DATABASE_UNAVAILABLE",
      })
    );
  });
  const database = drizzle(pool);
  return {
    run<T>(operation: () => Promise<T>): Promise<T> {
      return withPostgresDatabase(database, schema, operation);
    },
    close: () => pool.end(),
  };
}

/** Hyperdrive owns the durable pool; a Worker owns only this request's client. */
export async function withWorkerPostgres<T>(
  configuration: PostgresConfiguration,
  operation: () => Promise<T>
): Promise<T> {
  const schema = validatePostgresSchema(configuration.schema);
  const client = new Client({
    connectionString: parsePostgresConnection(configuration.connectionString)
      .href,
    connectionTimeoutMillis: 10_000,
    application_name: "one-gate-worker",
  });
  try {
    await client.connect();
    return await withPostgresDatabase(drizzle(client), schema, operation);
  } finally {
    await client.end().catch(() => {
      console.error(
        JSON.stringify({
          event: "postgresql.client_close_failed",
          code: "DATABASE_UNAVAILABLE",
        })
      );
    });
  }
}
