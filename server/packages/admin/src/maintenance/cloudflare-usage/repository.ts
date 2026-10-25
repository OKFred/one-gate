import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import type { Client, InValue } from "@libsql/client";
import type { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { getDb } from "@hodor/core/db/index";
import { isPostgresBackend } from "@hodor/core/db/postgresql/runtime";
import { createUsageRepository } from "./repository.shared";
import { createPostgresUsageRepository } from "./repository.pg";
import { record, type UsageRepository } from "./types";

type D1Client = Parameters<typeof drizzleD1>[0];
const dialect = new SQLiteSyncDialect();
function argument(value: unknown): InValue {
  if (value === null) return null;
  if (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "bigint" ||
    value instanceof Uint8Array
  )
    return value;
  throw new Error("Invalid usage SQL argument");
}
function libsql(value: unknown): value is Client {
  return (
    record(value) &&
    typeof value.execute === "function" &&
    typeof value.batch === "function"
  );
}
function d1(value: unknown): value is D1Client {
  return (
    record(value) &&
    typeof value.prepare === "function" &&
    typeof value.batch === "function"
  );
}
export function createSqliteUsageRepository(
  client: Client | D1Client
): UsageRepository {
  if (libsql(client))
    return createUsageRepository({
      async rows(query) {
        const compiled = dialect.sqlToQuery(query);
        const result = await client.execute({
          sql: compiled.sql,
          args: compiled.params.map(argument),
        });
        return result.rows.map((r) => ({ ...r }));
      },
      async batch(queries, write = true) {
        const result = await client.batch(
          queries.map((query) => {
            const compiled = dialect.sqlToQuery(query);
            return { sql: compiled.sql, args: compiled.params.map(argument) };
          }),
          write ? "write" : "read"
        );
        return result.map((r) => r.rows.map((row) => ({ ...row })));
      },
    });
  if (d1(client))
    return createUsageRepository({
      async rows(query) {
        const compiled = dialect.sqlToQuery(query);
        return (
          await client
            .prepare(compiled.sql)
            .bind(...compiled.params)
            .all<Record<string, unknown>>()
        ).results;
      },
      async batch(queries) {
        const result = await client.batch<Record<string, unknown>>(
          queries.map((query) => {
            const compiled = dialect.sqlToQuery(query);
            return client.prepare(compiled.sql).bind(...compiled.params);
          })
        );
        return result.map((r) => r.results);
      },
    });
  throw new Error("Cloudflare usage database unavailable");
}
export function getUsageRepository(): UsageRepository {
  if (isPostgresBackend()) return createPostgresUsageRepository();
  const database: unknown = getDb();
  const client: unknown = record(database) ? database.$client : null;
  if (!libsql(client) && !d1(client))
    throw new Error("Cloudflare usage database unavailable");
  return createSqliteUsageRepository(client);
}
