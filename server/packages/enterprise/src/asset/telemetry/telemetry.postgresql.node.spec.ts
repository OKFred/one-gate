import { afterAll, beforeAll, describe } from "vitest";
import { initAdminRegistry } from "@hodor/admin/register";
import {
  createPostgresTestHarness,
  postgresTestsConfigured,
  type PostgresTestHarness,
} from "../../../../../apps/server/test/postgresql";
import {
  telemetryIntegrationSuite,
  type TelemetryTestStore,
} from "./test-fixture";

describe.skipIf(!postgresTestsConfigured)(
  "PostgreSQL hardware identity integration",
  () => {
    let harness: PostgresTestHarness;
    let store: TelemetryTestStore;
    beforeAll(async () => {
      initAdminRegistry();
      harness = await createPostgresTestHarness("telemetry");
      store = {
        postgres: true,
        reset: () => harness.reset(),
        execute: async (query) => {
          await harness.query(query, true);
        },
        run: (operation) => harness.run(operation),
      };
    });
    afterAll(async () => {
      await harness?.close();
    });
    telemetryIntegrationSuite(() => store);
  }
);
