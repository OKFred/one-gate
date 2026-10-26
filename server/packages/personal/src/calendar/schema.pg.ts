import { sql } from "drizzle-orm";
import { check, index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { pgInteger, pgIntegerBounds } from "@hodor/core/db/postgresql/columns";

export const calendarEventTable = pgTable(
  "personal_calendar_event",
  {
    id: text("id").primaryKey(),
    ownerUserId: pgInteger("owner_user_id").notNull(),
    requestKey: text("request_key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url"),
    startTimeUtc: pgInteger("start_time_utc").notNull(),
    endTimeUtc: pgInteger("end_time_utc"),
    timeZone: text("time_zone").notNull(),
    reminderTimeUtc: pgInteger("reminder_time_utc"),
    reminderAcknowledgedTimeUtc: pgInteger("reminder_acknowledged_time_utc"),
    status: text("status", { enum: ["active", "cancelled"] }).notNull(),
    version: pgInteger("version").notNull(),
    createTimeUtc: pgInteger("create_time_utc").notNull(),
    updateTimeUtc: pgInteger("update_time_utc").notNull(),
  },
  (table) => [
    uniqueIndex("personal_calendar_event_owner_request_unique").on(
      table.ownerUserId,
      table.requestKey
    ),
    index("personal_calendar_event_owner_start_idx").on(
      table.ownerUserId,
      table.startTimeUtc,
      table.id
    ),
    index("personal_calendar_event_owner_reminder_idx")
      .on(table.ownerUserId, table.reminderTimeUtc, table.id)
      .where(
        sql`${table.status} = 'active' AND ${table.reminderAcknowledgedTimeUtc} IS NULL AND ${table.reminderTimeUtc} IS NOT NULL`
      ),
    check(
      "personal_calendar_event_status_check",
      sql`${table.status} IN ('active', 'cancelled')`
    ),
    check("personal_calendar_event_version_check", sql`${table.version} >= 1`),
    check(
      "personal_calendar_event_interval_check",
      sql`${table.endTimeUtc} IS NULL OR ${table.endTimeUtc} >= ${table.startTimeUtc}`
    ),
    check(
      "personal_calendar_event_reminder_check",
      sql`${table.reminderTimeUtc} IS NULL OR ${table.reminderTimeUtc} <= ${table.startTimeUtc}`
    ),
    ...pgIntegerBounds("personal_calendar_event", table),
  ]
);
