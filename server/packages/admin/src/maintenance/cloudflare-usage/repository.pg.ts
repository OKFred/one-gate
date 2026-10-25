import { withPostgresTransaction } from "@hodor/core/db/postgresql/runtime";
import { PgDialect } from "drizzle-orm/pg-core";
import { createUsageRepository } from "./repository.shared";
export function createPostgresUsageRepository() {
  return createUsageRepository({
    rows: (query) =>
      withPostgresTransaction(
        async (db) => (await db.execute<Record<string, unknown>>(query)).rows,
        {
          write: !new PgDialect()
            .sqlToQuery(query)
            .sql.trimStart()
            .startsWith("SELECT"),
        }
      ),
    batch: (queries, write = true) =>
      withPostgresTransaction(
        async (db) => {
          const results: Record<string, unknown>[][] = [];
          for (const query of queries)
            results.push(
              (await db.execute<Record<string, unknown>>(query)).rows
            );
          return results;
        },
        { write }
      ),
  });
}
