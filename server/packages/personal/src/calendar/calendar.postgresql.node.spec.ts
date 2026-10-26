import { afterAll, beforeAll, describe } from "vitest";
import {
  getPostgresDb,
  withPostgresTransaction,
} from "@hodor/core/db/postgresql/runtime";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../../../../apps/server/test/postgresql";
import { calendarEventTable } from "./schema.pg";
import { calendarContractTests } from "./calendar.contract-tests";

describe.skipIf(!postgresTestsConfigured)(
  "loopback PostgreSQL calendar",
  () => {
    let harness: PostgresTestHarness;
    beforeAll(async () => {
      harness = await createPostgresTestHarness("calendar");
    });
    afterAll(() => harness?.close());
    calendarContractTests({
      reset: () => harness.reset(),
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
    });
  }
);
