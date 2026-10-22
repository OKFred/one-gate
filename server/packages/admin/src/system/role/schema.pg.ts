import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import type { DataScopeValue } from "@hodor/core/types/dataScope";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
  pgSoftDeleteColumns,
} from "@hodor/core/db/postgresql/columns";

export const roleTable = pgTable(
  "system_role",
  {
    id: pgIdentity(),
    name: text("name").notNull(),
    remark: text("remark"),
    isEnabled: boolean("is_enabled").notNull(),
    permissionCount: pgInteger("permission_count").notNull(),
    dataScope: text("data_scope").$type<DataScopeValue>().notNull(),
    customDeptIds: text("custom_dept_ids"),
    ...pgAuditColumns(),
    ...pgSoftDeleteColumns(),
  },
  (table) => [
    ...pgIntegerBounds("system_role", table),
    uniqueIndex("system_role_name_active_unique")
      .on(table.name)
      .where(sql`NOT ${table.isDeleted}`),
    index("system_role_deleted_time_idx").on(
      table.isDeleted,
      table.deletedTimeUtc
    ),
    check(
      "system_role_soft_delete_state_check",
      sql`(NOT ${table.isDeleted} AND ${table.deletedTimeUtc} IS NULL AND ${table.deleterId} IS NULL) OR (${table.isDeleted} AND ${table.deletedTimeUtc} IS NOT NULL AND ${table.deleterId} IS NOT NULL)`
    ),
  ]
);

export default roleTable;
