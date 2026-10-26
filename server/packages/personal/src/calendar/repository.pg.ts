import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import {
  and,
  asc,
  eq,
  gt,
  gte,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { calendarEventTable as table } from "./schema.pg";
import type { CalendarRepository } from "./repository";

const owned = (owner: number) => eq(table.ownerUserId, owner);
const active = (owner: number) => and(owned(owner), eq(table.status, "active"));
const unacknowledged = (owner: number) =>
  and(
    active(owner),
    isNotNull(table.reminderTimeUtc),
    isNull(table.reminderAcknowledgedTimeUtc)
  );

export const postgresCalendarRepository: CalendarRepository = {
  find: (owner, id) =>
    withPostgresTransaction(
      async () =>
        (
          await getPostgresDb()
            .select()
            .from(table)
            .where(and(owned(owner), eq(table.id, id)))
            .limit(1)
        )[0] ?? null,
      { write: false }
    ),
  findRequest: (owner, requestKey) =>
    withPostgresTransaction(
      async () =>
        (
          await getPostgresDb()
            .select()
            .from(table)
            .where(and(owned(owner), eq(table.requestKey, requestKey)))
            .limit(1)
        )[0] ?? null,
      { write: false }
    ),
  insert: (data) =>
    withPostgresTransaction(
      async () =>
        (
          await getPostgresDb()
            .insert(table)
            .values(data)
            .onConflictDoNothing({
              target: [table.ownerUserId, table.requestKey],
            })
            .returning()
        )[0] ?? null,
      { write: true }
    ),
  list: (owner, from, to, limit) =>
    withPostgresTransaction(
      async () =>
        getPostgresDb()
          .select()
          .from(table)
          .where(
            and(
              active(owner),
              lt(table.startTimeUtc, to),
              or(gte(table.startTimeUtc, from), gt(table.endTimeUtc, from))
            )
          )
          .orderBy(asc(table.startTimeUtc), asc(table.id))
          .limit(limit),
      { write: false }
    ),
  upcoming: (owner, now, limit) =>
    withPostgresTransaction(
      async () =>
        getPostgresDb()
          .select()
          .from(table)
          .where(and(active(owner), gte(table.startTimeUtc, now)))
          .orderBy(asc(table.startTimeUtc), asc(table.id))
          .limit(limit),
      { write: false }
    ),
  due: (owner, now, limit) =>
    withPostgresTransaction(
      async () =>
        getPostgresDb()
          .select()
          .from(table)
          .where(and(unacknowledged(owner), lte(table.reminderTimeUtc, now)))
          .orderBy(asc(table.reminderTimeUtc), asc(table.id))
          .limit(limit),
      { write: false }
    ),
  nextReminder: (owner, now) =>
    withPostgresTransaction(
      async () => {
        const result = await getPostgresDb()
          .select({ time: table.reminderTimeUtc })
          .from(table)
          .where(and(unacknowledged(owner), gt(table.reminderTimeUtc, now)))
          .orderBy(asc(table.reminderTimeUtc), asc(table.id))
          .limit(1);
        return result[0]?.time ?? null;
      },
      { write: false }
    ),
  update: (owner, id, version, data, now) =>
    withPostgresTransaction(
      async () => {
        const rows = await getPostgresDb()
          .update(table)
          .set({
            ...data,
            reminderAcknowledgedTimeUtc: sql`CASE WHEN ${table.startTimeUtc} = ${data.startTimeUtc} AND ${table.reminderTimeUtc} IS NOT DISTINCT FROM ${data.reminderTimeUtc}::bigint THEN ${table.reminderAcknowledgedTimeUtc} ELSE NULL END`,
            version: sql`${table.version} + 1`,
            updateTimeUtc: now,
          })
          .where(
            and(active(owner), eq(table.id, id), eq(table.version, version))
          )
          .returning();
        return rows[0] ?? null;
      },
      { write: true }
    ),
  cancel: (owner, id, version, now) =>
    withPostgresTransaction(
      async () => {
        const rows = await getPostgresDb()
          .update(table)
          .set({
            status: "cancelled",
            version: sql`${table.version} + 1`,
            updateTimeUtc: now,
          })
          .where(
            and(active(owner), eq(table.id, id), eq(table.version, version))
          )
          .returning({ id: table.id });
        return rows[0]?.id ?? null;
      },
      { write: true }
    ),
  ack: (owner, id, version, reminder, now) =>
    withPostgresTransaction(
      async () => {
        const rows = await getPostgresDb()
          .update(table)
          .set({ reminderAcknowledgedTimeUtc: now })
          .where(
            and(
              active(owner),
              eq(table.id, id),
              eq(table.version, version),
              eq(table.reminderTimeUtc, reminder),
              lte(table.reminderTimeUtc, now),
              isNull(table.reminderAcknowledgedTimeUtc)
            )
          )
          .returning();
        return rows[0] ?? null;
      },
      { write: true }
    ),
};
