import { beforeAll, describe } from "vitest";
import { sql } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { setupTestDb } from "@hodor/core/db/testHelper";
import { initAdminRegistry } from "@hodor/admin/register";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import tokenSql from "@hodor/core/db/sql/admin/system_api_token.sql?raw";
import tenantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant.sql?raw";
import memberSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_member.sql?raw";
import grantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_api_token_grant.sql?raw";
import assetSql from "@hodor/core/db/sql/enterprise/enterprise_asset.sql?raw";
import identifierSql from "@hodor/core/db/sql/enterprise/enterprise_asset_identifier.sql?raw";
import assignmentSql from "@hodor/core/db/sql/enterprise/enterprise_asset_assignment.sql?raw";
import bindingSql from "@hodor/core/db/sql/enterprise/enterprise_asset_measurement_binding.sql?raw";
import {
  telemetryIntegrationSuite,
  type TelemetryTestStore,
} from "./test-fixture";

const tables = [
  "enterprise_asset_measurement_binding",
  "enterprise_asset_assignment",
  "enterprise_asset_identifier",
  "enterprise_asset",
  "enterprise_tenant_api_token_grant",
  "enterprise_tenant_member",
  "enterprise_tenant",
  "system_role_permission",
  "system_permission",
  "system_api_token",
  "system_user",
  "system_role",
];
const store: TelemetryTestStore = {
  postgres: false,
  async reset() {
    for (const table of tables)
      await db.run(sql`DELETE FROM ${sql.identifier(table)}`);
  },
  async execute(query) {
    await db.run(query);
  },
  run: (operation) => operation(),
};
describe("SQLite/D1 hardware identity integration", () => {
  beforeAll(async () => {
    initAdminRegistry();
    await setupTestDb(db, [
      userSql,
      roleSql,
      permissionSql,
      rolePermissionSql,
      tokenSql,
      tenantSql,
      memberSql,
      grantSql,
      assetSql,
      identifierSql,
      assignmentSql,
      bindingSql,
    ]);
  });
  telemetryIntegrationSuite(() => store);
});
