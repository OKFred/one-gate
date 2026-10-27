import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import { registry } from "@hodor/admin/common/registry";
import { and, asc, eq, sql } from "drizzle-orm";
import { calendarEventTable } from "../schema.pg";
import { calendarSubscriptionTable as table } from "./schema.pg";
import type { SubscriptionRepository } from "./repository";

const ownerActive = (owner: number) =>
  registry.system.access.userActiveSql(owner);
export const postgresSubscriptionRepository: SubscriptionRepository = {
  find: (owner) =>
    withPostgresTransaction(
      async () =>
        (
          await getPostgresDb()
            .select()
            .from(table)
            .where(eq(table.ownerUserId, owner))
            .limit(1)
        )[0] ?? null,
      { write: false }
    ),
  change: (owner, expectedVersion, tokenHash, now) =>
    withPostgresTransaction(
      async () => {
        if (expectedVersion === null) {
          const rows = await getPostgresDb()
            .insert(table)
            .select(
              sql`SELECT ${owner}::bigint, ${tokenHash}::text, 1, ${now}::bigint, ${now}::bigint WHERE ${ownerActive(owner)}`
            )
            .onConflictDoNothing({ target: table.ownerUserId })
            .returning();
          return rows[0] ?? null;
        }
        return (
          (
            await getPostgresDb()
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
      { write: true }
    ),
  credential: (tokenHash) =>
    withPostgresTransaction(
      async () =>
        (
          await getPostgresDb()
            .select()
            .from(table)
            .where(
              and(
                eq(table.tokenHash, tokenHash),
                registry.system.access.userActiveSql(sql`${table.ownerUserId}`)
              )
            )
            .limit(1)
        )[0] ?? null,
      { write: false }
    ),
  feed: (tokenHash, credential, limit) =>
    withPostgresTransaction(
      async () => {
        const rows = await getPostgresDb()
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
          .orderBy(
            asc(calendarEventTable.startTimeUtc),
            asc(calendarEventTable.id)
          )
          .limit(limit);
        return {
          authorized: rows.length > 0,
          events: rows.flatMap((row) => (row.event ? [row.event] : [])),
        };
      },
      { write: false }
    ),
};
