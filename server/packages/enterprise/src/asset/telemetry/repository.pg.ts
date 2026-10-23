import { sql } from "drizzle-orm";
import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import {
  catalogQuery,
  projectCatalog,
  type CatalogJoinRow,
} from "./catalog-query";
import { telemetryGuard, type TelemetryContext } from "./context";

export async function postgresCatalogContent(
  context: TelemetryContext,
  hostAssetId: string
) {
  return withPostgresTransaction(async () => {
    const result = await getPostgresDb().execute<CatalogJoinRow>(
      catalogQuery(
        context.tenantId,
        hostAssetId,
        telemetryGuard(context),
        sql`TRUE`
      )
    );
    return projectCatalog(context.tenantId, result.rows);
  });
}
