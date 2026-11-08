import { afterAll, beforeAll, describe } from "vitest";
import { initAdminRegistry } from "@hodor/admin/register";
import { initEnterpriseRegistry } from "@hodor/enterprise/register";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../../../../apps/server/test/postgresql";
import { assetContractTests } from "./asset.contract-tests";

describe.skipIf(!postgresTestsConfigured)(
  "loopback PostgreSQL private asset spaces",
  () => {
    let harness: PostgresTestHarness;
    beforeAll(async () => {
      initAdminRegistry();
      initEnterpriseRegistry();
      harness = await createPostgresTestHarness("asset_spaces");
    });
    afterAll(() => harness?.close());
    assetContractTests({
      postgres: true,
      reset: () => harness.reset(),
      execute: async (query) => {
        await harness.query(query, true);
      },
      query: (query) => harness.query(query),
      run: (operation) => harness.run(operation),
    });
  }
);
