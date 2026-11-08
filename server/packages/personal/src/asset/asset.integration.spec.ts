import { beforeAll, describe } from "vitest";
import { sql } from "drizzle-orm";
import db from "@hodor/core/db/index";
import { setupTestDb } from "@hodor/core/db/testHelper";
import { initAdminRegistry } from "@hodor/admin/register";
import { initEnterpriseRegistry } from "@hodor/enterprise/register";
import userSql from "@hodor/core/db/sql/admin/system_user.sql?raw";
import roleSql from "@hodor/core/db/sql/admin/system_role.sql?raw";
import permissionSql from "@hodor/core/db/sql/admin/system_permission.sql?raw";
import rolePermissionSql from "@hodor/core/db/sql/admin/system_role_permission.sql?raw";
import tenantSql from "@hodor/core/db/sql/enterprise/enterprise_tenant.sql?raw";
import memberSql from "@hodor/core/db/sql/enterprise/enterprise_tenant_member.sql?raw";
import assetSql from "@hodor/core/db/sql/enterprise/enterprise_asset.sql?raw";
import assignmentSql from "@hodor/core/db/sql/enterprise/enterprise_asset_assignment.sql?raw";
import placementSql from "@hodor/core/db/sql/personal/personal_asset_placement.sql?raw";
import {
  assetContractTests,
  type AssetTestStore,
} from "./asset.contract-tests";

const store: AssetTestStore = {
  postgres: false,
  async reset() {
    for (const name of [
      "personal_asset_placement",
      "enterprise_asset_assignment",
      "enterprise_asset",
      "enterprise_tenant_member",
      "enterprise_tenant",
      "system_role_permission",
      "system_permission",
      "system_user",
      "system_role",
    ])
      await db.run(sql`DELETE FROM ${sql.identifier(name)}`);
  },
  async execute(query) {
    await db.run(query);
  },
  query: (query) => db.all(query),
  run: (operation) => operation(),
};

describe("SQLite/D1 private asset spaces", () => {
  beforeAll(async () => {
    initAdminRegistry();
    initEnterpriseRegistry();
    await setupTestDb(db, [
      userSql,
      roleSql,
      permissionSql,
      rolePermissionSql,
      tenantSql,
      memberSql,
      assetSql,
      assignmentSql,
      placementSql,
    ]);
  });
  assetContractTests(store);
});
