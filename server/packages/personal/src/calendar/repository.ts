import db from "@hodor/core/db/index";
import { isPostgresBackend } from "@hodor/core/db/postgresql/runtime";
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
import {
  calendarEventTable as table,
  type CalendarEditable,
  type CalendarEventInsert,
  type CalendarEventRecord,
} from "./model";
import { postgresCalendarRepository } from "./repository.pg";

export interface CalendarRepository {
  find(owner: number, id: string): Promise<CalendarEventRecord | null>;
  findRequest(
    owner: number,
    requestKey: string
  ): Promise<CalendarEventRecord | null>;
  insert(data: CalendarEventInsert): Promise<CalendarEventRecord | null>;
  list(
    owner: number,
    from: number,
    to: number,
    limit: number
  ): Promise<CalendarEventRecord[]>;
  upcoming(
    owner: number,
    now: number,
    limit: number
  ): Promise<CalendarEventRecord[]>;
  due(
    owner: number,
    now: number,
    limit: number
  ): Promise<CalendarEventRecord[]>;
  nextReminder(owner: number, now: number): Promise<number | null>;
  update(
    owner: number,
    id: string,
    version: number,
    data: CalendarEditable,
    now: number
  ): Promise<CalendarEventRecord | null>;
  cancel(
    owner: number,
    id: string,
    version: number,
    now: number
  ): Promise<string | null>;
  ack(
    owner: number,
    id: string,
    version: number,
    reminder: number,
    now: number
  ): Promise<CalendarEventRecord | null>;
}

const owned = (owner: number) => eq(table.ownerUserId, owner);
const active = (owner: number) => and(owned(owner), eq(table.status, "active"));
const unacknowledged = (owner: number) =>
  and(
    active(owner),
    isNotNull(table.reminderTimeUtc),
    isNull(table.reminderAcknowledgedTimeUtc)
  );

export const sqliteCalendarRepository: CalendarRepository = {
  async find(owner, id) {
    return (
      (
        await db
          .select()
          .from(table)
          .where(and(owned(owner), eq(table.id, id)))
          .limit(1)
      )[0] ?? null
    );
  },
  async findRequest(owner, requestKey) {
    return (
      (
        await db
          .select()
          .from(table)
          .where(and(owned(owner), eq(table.requestKey, requestKey)))
          .limit(1)
      )[0] ?? null
    );
  },
  async insert(data) {
    return (
      (
        await db
          .insert(table)
          .values(data)
          .onConflictDoNothing({
            target: [table.ownerUserId, table.requestKey],
          })
          .returning()
      )[0] ?? null
    );
  },
  async list(owner, from, to, limit) {
    return db
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
      .limit(limit);
  },
  async upcoming(owner, now, limit) {
    return db
      .select()
      .from(table)
      .where(and(active(owner), gte(table.startTimeUtc, now)))
      .orderBy(asc(table.startTimeUtc), asc(table.id))
      .limit(limit);
  },
  async due(owner, now, limit) {
    return db
      .select()
      .from(table)
      .where(and(unacknowledged(owner), lte(table.reminderTimeUtc, now)))
      .orderBy(asc(table.reminderTimeUtc), asc(table.id))
      .limit(limit);
  },
  async nextReminder(owner, now) {
    const result = await db
      .select({ time: table.reminderTimeUtc })
      .from(table)
      .where(and(unacknowledged(owner), gt(table.reminderTimeUtc, now)))
      .orderBy(asc(table.reminderTimeUtc), asc(table.id))
      .limit(1);
    return result[0]?.time ?? null;
  },
  async update(owner, id, version, data, now) {
    const rows = await db
      .update(table)
      .set({
        ...data,
        reminderAcknowledgedTimeUtc: sql`CASE WHEN ${table.startTimeUtc} = ${data.startTimeUtc} AND ${table.reminderTimeUtc} IS ${data.reminderTimeUtc} THEN ${table.reminderAcknowledgedTimeUtc} ELSE NULL END`,
        version: sql`${table.version} + 1`,
        updateTimeUtc: now,
      })
      .where(and(active(owner), eq(table.id, id), eq(table.version, version)))
      .returning();
    return rows[0] ?? null;
  },
  async cancel(owner, id, version, now) {
    const rows = await db
      .update(table)
      .set({
        status: "cancelled",
        version: sql`${table.version} + 1`,
        updateTimeUtc: now,
      })
      .where(and(active(owner), eq(table.id, id), eq(table.version, version)))
      .returning({ id: table.id });
    return rows[0]?.id ?? null;
  },
  async ack(owner, id, version, reminder, now) {
    const rows = await db
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
};

export function getCalendarRepository(): CalendarRepository {
  return isPostgresBackend()
    ? postgresCalendarRepository
    : sqliteCalendarRepository;
}
