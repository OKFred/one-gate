import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function readRepositoryFile(relativeUrl: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativeUrl, import.meta.url)),
    "utf8"
  );
}

describe("D1 deployment contract", () => {
  it("configures the official Wrangler migration ledger", () => {
    const config = readRepositoryFile("../wrangler.jsonc");
    expect(config).toContain('"migrations_dir": "d1-migrations"');

    const baseline = readRepositoryFile(
      "../d1-migrations/0000_legacy_schema_baseline.sql"
    );
    expect(baseline).toContain("legacy_schema_baseline");
  });

  it("checks the critical production tables before Worker deployment", () => {
    const contract = readRepositoryFile("../d1-contract/worker-schema.sql");
    expect(contract).toContain("FROM `admin_mobile_device`");
    expect(contract).toContain("FROM `admin_mobile_device_event`");
    expect(contract).toContain("FROM `admin_mobile_async_task`");
    expect(contract).toContain("FROM `system_schema_form`");
    expect(contract).toContain(
      "INDEXED BY `admin_mobile_device_last_heartbeat_idx`"
    );
    expect(contract).toContain(
      "INDEXED BY `admin_mobile_device_event_client_event_unique`"
    );
  });

  it("runs migrations and the schema contract before Worker deployment", () => {
    const workflow = readRepositoryFile(
      "../../../../.github/workflows/test.yml"
    );
    const migrateAt = workflow.indexOf("Apply Remote D1 Migrations");
    const contractAt = workflow.indexOf("Verify Remote D1 Schema Contract");
    const deployAt = workflow.indexOf("Deploy Workers Backend");

    expect(migrateAt).toBeGreaterThan(-1);
    expect(contractAt).toBeGreaterThan(migrateAt);
    expect(deployAt).toBeGreaterThan(contractAt);
  });

  it("deploys the required mobile sensitive-data secret", () => {
    const workflow = readRepositoryFile(
      "../../../../.github/workflows/test.yml"
    );
    expect(workflow).toContain("MOBILE_SENSITIVE_DATA_KEY");
  });
});
