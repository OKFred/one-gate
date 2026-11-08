import { and, eq } from "drizzle-orm";
import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import { assetPlacementTable as table } from "./schema.pg";
import {
  placementValue,
  placementWriteQuery,
  type PlacementRepository,
  type PlacementRow,
} from "./repository";

export const postgresPlacementRepository: PlacementRepository = {
  list: (owner, tenantId) =>
    withPostgresTransaction(async () => {
      const records = await getPostgresDb()
        .select()
        .from(table)
        .where(and(eq(table.ownerUserId, owner), eq(table.tenantId, tenantId)));
      return new Map(records.map((row) => [row.assetId, placementValue(row)]));
    }),
  place: (owner, input, sourceGuard, now) =>
    withPostgresTransaction(
      async () => {
        const result = await getPostgresDb().execute<PlacementRow>(
          placementWriteQuery(owner, input, sourceGuard, now)
        );
        return result.rows[0] ? placementValue(result.rows[0]) : null;
      },
      { write: true }
    ),
};
