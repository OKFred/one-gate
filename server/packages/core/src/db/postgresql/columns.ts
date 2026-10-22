import { sql } from "drizzle-orm";
import { bigint, boolean, check, type PgColumn } from "drizzle-orm/pg-core";

export const PG_MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

export function pgInteger(name: string) {
  return bigint(name, { mode: "number" });
}

export function pgIdentity(name = "id") {
  return pgInteger(name).primaryKey().generatedByDefaultAsIdentity({
    minValue: 1,
    maxValue: PG_MAX_SAFE_INTEGER,
  });
}

export function pgTimestampUtcSql() {
  return sql<number>`floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint`;
}

export function pgAuditColumns() {
  return {
    creatorId: pgInteger("creator_id").notNull(),
    updaterId: pgInteger("updater_id"),
    createTimeUtc: pgInteger("create_time_utc")
      .notNull()
      .default(pgTimestampUtcSql()),
    updateTimeUtc: pgInteger("update_time_utc"),
  };
}

export function pgSoftDeleteColumns() {
  return {
    isDeleted: boolean("is_deleted").notNull(),
    deletedTimeUtc: pgInteger("deleted_time_utc"),
    deleterId: pgInteger("deleter_id"),
  };
}

/** JSON contracts use JS numbers; reject values that could be rounded by the driver. */
export function pgIntegerBounds(
  tableName: string,
  columns: Record<string, PgColumn>
) {
  return Object.values(columns)
    .filter((column) => column.columnType === "PgBigInt53")
    .map((column) =>
      check(
        `${tableName}_safe_${column.name}`,
        sql`${column} BETWEEN -9007199254740991 AND 9007199254740991`
      )
    );
}
