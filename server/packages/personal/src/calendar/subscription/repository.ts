import db from "@hodor/core/db/index";
import { isPostgresBackend } from "@hodor/core/db/postgresql/runtime";
import { registry } from "@hodor/admin/common/registry";
import { and, asc, eq, sql } from "drizzle-orm";
import { calendarEventTable, type CalendarEventRecord } from "../model";
import {
  calendarSubscriptionTable as table,
  type CalendarSubscriptionRecord,
} from "./model";
import { postgresSubscriptionRepository } from "./repository.pg";

export interface SubscriptionFeed {
  authorized: boolean;
  events: CalendarEventRecord[];
}
export interface SubscriptionRepository {
  find(owner: number): Promise<CalendarSubscriptionRecord | null>;
  change(
    owner: number,
    expectedVersion: number | null,
    tokenHash: string | null,
    now: number
  ): Promise<CalendarSubscriptionRecord | null>;
  credential(tokenHash: string): Promise<CalendarSubscriptionRecord | null>;
  feed(
    tokenHash: string,
    credential: CalendarSubscriptionRecord,
    limit: number
  ): Promise<SubscriptionFeed>;
}
const ownerActive = (owner: number) =>
  registry.system.access.userActiveSql(owner);
export const sqliteSubscriptionRepository: SubscriptionRepository = {
  async find(owner) {
    return (
      (
        await db
          .select()
          .from(table)
          .where(eq(table.ownerUserId, owner))
          .limit(1)
      )[0] ?? null
    );
  },
  async change(owner, expectedVersion, tokenHash, now) {
    if (expectedVersion === null) {
      const rows = await db
        .insert(table)
        .select(
          sql`SELECT ${owner}, ${tokenHash}, 1, ${now}, ${now} WHERE ${ownerActive(owner)}`
        )
        .onConflictDoNothing({ target: table.ownerUserId })
        .returning();
      return rows[0] ?? null;
    }
    return (
      (
        await db
          .update(table)
          .set({
            tokenHash,
            version: sql`${table.version} + 1`,
            updateTimeUtc: now,
          })
          .where(
            and(
              eq(table.ownerUserId, owner),
              eq(table.version, expectedVersion),
              ownerActive(owner)
            )
          )
          .returning()
      )[0] ?? null
    );
  },
  async credential(tokenHash) {
    return (
      (
        await db
          .select()
          .from(table)
          .where(
            and(
              eq(table.tokenHash, tokenHash),
              registry.system.access.userActiveSql(sql`${table.ownerUserId}`)
            )
          )
          .limit(1)
      )[0] ?? null
    );
  },
  async feed(tokenHash, credential, limit) {
    const rows = await db
      .select({ event: calendarEventTable })
      .from(table)
      .leftJoin(
        calendarEventTable,
        and(
          eq(calendarEventTable.ownerUserId, table.ownerUserId),
          eq(calendarEventTable.status, "active")
        )
      )
      .where(
        and(
          eq(table.tokenHash, tokenHash),
          eq(table.ownerUserId, credential.ownerUserId),
          eq(table.version, credential.version),
          ownerActive(credential.ownerUserId)
        )
      )
      .orderBy(asc(calendarEventTable.startTimeUtc), asc(calendarEventTable.id))
      .limit(limit);
    return {
      authorized: rows.length > 0,
      events: rows.flatMap((row) => (row.event ? [row.event] : [])),
    };
  },
};
export function getSubscriptionRepository(): SubscriptionRepository {
  return isPostgresBackend()
    ? postgresSubscriptionRepository
    : sqliteSubscriptionRepository;
}
