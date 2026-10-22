import { sql } from "drizzle-orm";
import { pgTable, integer, check } from "drizzle-orm/pg-core";

/** First PG release serializes writes across all supported domains. */
export const writeGuardTable = pgTable(
  "one_gate_write_guard",
  {
    id: integer("id").primaryKey(),
  },
  (table) => [check("one_gate_write_guard_singleton", sql`${table.id} = 1`)]
);
