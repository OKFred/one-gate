import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
  pgSoftDeleteColumns,
} from "@hodor/core/db/postgresql/columns";

export const departmentTable = pgTable(
  "system_department",
  {
    id: pgIdentity(),
    name: text("name").notNull(),
    parentId: pgInteger("parent_id"),
    remark: text("remark"),
    isEnabled: boolean("is_enabled").notNull(),
    ...pgAuditColumns(),
    ...pgSoftDeleteColumns(),
  },
  (table) => [
    ...pgIntegerBounds("system_department", table),
    uniqueIndex("system_department_name_active_unique")
      .on(table.name)
      .where(sql`NOT ${table.isDeleted}`),
    index("system_department_deleted_time_idx").on(
      table.isDeleted,
      table.deletedTimeUtc
    ),
    index("system_department_parent_id_idx").on(table.parentId),
    check(
      "system_department_soft_delete_state_check",
      sql`(NOT ${table.isDeleted} AND ${table.deletedTimeUtc} IS NULL AND ${table.deleterId} IS NULL) OR (${table.isDeleted} AND ${table.deletedTimeUtc} IS NOT NULL AND ${table.deleterId} IS NOT NULL)`
    ),
  ]
);

export default departmentTable;
