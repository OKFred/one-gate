import { sql } from "drizzle-orm";
import { check, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { pgInteger, pgIntegerBounds } from "@hodor/core/db/postgresql/columns";

export const calendarSubscriptionTable = pgTable(
  "personal_calendar_subscription",
  {
    ownerUserId: pgInteger("owner_user_id").primaryKey().notNull(),
    tokenHash: text("token_hash"),
    version: pgInteger("version").notNull(),
    createTimeUtc: pgInteger("create_time_utc").notNull(),
    updateTimeUtc: pgInteger("update_time_utc").notNull(),
  },
  (table) => [
    uniqueIndex("personal_calendar_subscription_token_unique").on(
      table.tokenHash
    ),
    check(
      "personal_calendar_subscription_owner_check",
      sql`${table.ownerUserId} > 0`
    ),
    check(
      "personal_calendar_subscription_version_check",
      sql`${table.version} >= 1`
    ),
    check(
      "personal_calendar_subscription_token_check",
      sql`${table.tokenHash} IS NULL OR ${table.tokenHash} ~ '^[0-9a-f]{64}$'`
    ),
    ...pgIntegerBounds("personal_calendar_subscription", table),
  ]
);
