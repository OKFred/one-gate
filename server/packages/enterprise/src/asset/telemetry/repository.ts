import { sql } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { isPostgresBackend } from "@hodor/core/db/postgresql/runtime";
import {
  catalogQuery,
  projectCatalog,
  type CatalogJoinRow,
} from "./catalog-query";
import { telemetryGuard, type TelemetryContext } from "./context";
import { postgresCatalogContent } from "./repository.pg";

export const telemetryRepository = {
  async catalogContent(context: TelemetryContext, hostAssetId: string) {
    if (isPostgresBackend())
      return postgresCatalogContent(context, hostAssetId);
    const rows = await db.all<CatalogJoinRow>(
      catalogQuery(
        context.tenantId,
        hostAssetId,
        telemetryGuard(context),
        sql`1`
      )
    );
    return projectCatalog(context.tenantId, rows);
  },
};
