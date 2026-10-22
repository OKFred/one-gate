import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { getEnv } from "../../utils/env";

export type PostgresDatabase = PgDatabase<NodePgQueryResultHKT>;
type TransactionScope = {
  readonly database: PostgresDatabase;
  readonly schema: string;
  readonly transaction: boolean;
  readonly write: boolean;
  readonly writeCheck?: () => Promise<void>;
  readonly lifetime: {
    closed: boolean;
    queue: Promise<void>;
    readonly pending: Set<Promise<unknown>>;
  };
};

const scopes = new AsyncLocalStorage<TransactionScope>();

/** Scope a trusted authorization check to business work, without committing HTTP error responses. */
export async function withPostgresWriteCheck<T>(
  check: () => Promise<void>,
  operation: () => Promise<T>
): Promise<T> {
  if (!isPostgresBackend()) return operation();
  const scope = scopes.getStore();
  if (!scope || scope.lifetime.closed)
    throw new Error("PostgreSQL database scope is missing");
  const previous = scope.writeCheck;
  return scopes.run(
    {
      ...scope,
      writeCheck: async () => {
        await previous?.();
        await check();
      },
    },
    operation
  );
}

export function isPostgresBackend(): boolean {
  if (scopes.getStore()) return true;
  const selected = getEnv("DATABASE_BACKEND");
  if (!selected || selected === "sqlite" || selected === "d1") return false;
  if (selected !== "postgresql")
    throw new Error("Unsupported DATABASE_BACKEND configuration");
  return true;
}

/** Schemas are application-owned identifiers, never arbitrary SQL or public data. */
export function validatePostgresSchema(schema: string): string {
  if (!/^one_gate(?:_[a-z0-9_]+)?$/.test(schema) || schema.length > 63)
    throw new Error(
      "PG_SCHEMA must be one_gate or an application-owned one_gate_* schema"
    );
  return schema;
}

export async function withPostgresDatabase<T>(
  database: PostgresDatabase,
  schema: string,
  operation: () => Promise<T>
): Promise<T> {
  if (scopes.getStore())
    throw new Error("A PostgreSQL database scope is already active");
  const scope: TransactionScope = {
    database,
    schema: validatePostgresSchema(schema),
    transaction: false,
    write: false,
    lifetime: { closed: false, queue: Promise.resolve(), pending: new Set() },
  };
  return scopes.run(scope, async () => {
    try {
      return await operation();
    } finally {
      // Authentication and log hooks may register database work with waitUntil.
      while (scope.lifetime.pending.size)
        await Promise.allSettled([...scope.lifetime.pending]);
      scope.lifetime.closed = true;
    }
  });
}

export function getPostgresDb(): PostgresDatabase {
  const scope = scopes.getStore();
  if (!scope?.transaction || scope.lifetime.closed)
    throw new Error("PostgreSQL access requires an active transaction scope");
  return scope.database;
}

export function getPostgresSchema(): string {
  const scope = scopes.getStore();
  if (!scope || scope.lifetime.closed)
    throw new Error("PostgreSQL database scope is missing");
  return scope.schema;
}

/** Every operation has a transaction-local search_path, including pooled reads. */
export async function withPostgresTransaction<T>(
  operation: (database: PostgresDatabase) => Promise<T>,
  options: { readonly write?: boolean } = {}
): Promise<T> {
  const scope = scopes.getStore();
  if (!scope || scope.lifetime.closed)
    throw new Error("PostgreSQL database scope is missing");
  const write = options.write === true;
  if (scope.transaction) {
    if (write && !scope.write)
      throw new Error(
        "A read transaction cannot be upgraded to a write transaction"
      );
    return operation(scope.database);
  }
  const previous = scope.lifetime.queue;
  let release: () => void = () => {};
  scope.lifetime.queue = new Promise<void>((resolve) => {
    release = resolve;
  });
  // A Worker client cannot run two overlapping BEGIN/COMMIT sequences.
  const pending = (async () => {
    await previous;
    try {
      return await scope.database.transaction(async (transaction) => {
        // Only a strictly validated application-owned identifier enters this SQL.
        await transaction.execute(
          sql.raw(`SET LOCAL search_path TO "${scope.schema}", pg_catalog`)
        );
        await transaction.execute(sql`SET LOCAL statement_timeout = '30s'`);
        if (write) {
          // Deliberately serialize first-release writes, including identity revocation.
          const guard = await transaction.execute<{ id: number }>(
            sql`SELECT id FROM one_gate_write_guard WHERE id = 1 FOR UPDATE`
          );
          if (guard.rows.length !== 1)
            throw new Error("PostgreSQL write guard is not initialized");
        }
        return scopes.run(
          { ...scope, database: transaction, transaction: true, write },
          async () => {
            if (write) await scope.writeCheck?.();
            return operation(transaction);
          }
        );
      });
    } finally {
      release();
    }
  })();
  scope.lifetime.pending.add(pending);
  try {
    return await pending;
  } finally {
    scope.lifetime.pending.delete(pending);
  }
}
