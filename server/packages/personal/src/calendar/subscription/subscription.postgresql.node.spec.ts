import { afterAll, beforeAll, describe } from "vitest";
import { sql } from "drizzle-orm";
import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../../../../../apps/server/test/postgresql";
import { calendarEventTable } from "../schema.pg";
import { subscriptionContractTests } from "./subscription.contract-tests";

describe.skipIf(!postgresTestsConfigured)(
  "loopback PostgreSQL private calendar subscription",
  () => {
    let harness: PostgresTestHarness;
    beforeAll(async () => {
      harness = await createPostgresTestHarness("calendar_sub");
    });
    afterAll(() => harness?.close());
    subscriptionContractTests({
      async reset() {
        await harness.reset();
        for (const id of [17, 18])
          await harness.query(
            sql`INSERT INTO "system_user"(id,username,password,lang_code,role_id_arr,is_enabled,creator_id,create_time_utc) VALUES (${id},${`synthetic-subscription-${id}`},'synthetic-unusable-hash','en-US','[]'::jsonb,TRUE,${id},1)`,
            true
          );
      },
      run: (operation) => harness.run(operation),
      insertMany: (rows) =>
        harness.run(() =>
          withPostgresTransaction(
            async () => {
              await getPostgresDb().insert(calendarEventTable).values(rows);
            },
            { write: true }
          )
        ),
      setEnabled: async (owner, enabled) => {
        await harness.query(
          sql`UPDATE "system_user" SET is_enabled=${enabled} WHERE id=${owner}`,
          true
        );
      },
      deleteOwner: async (owner) => {
        await harness.query(
          sql`DELETE FROM "system_user" WHERE id=${owner}`,
          true
        );
      },
    });
  }
);
