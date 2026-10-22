import { pgTable } from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const rolePermissionTable = pgTable(
  "system_role_permission",
  {
    id: pgIdentity(),
    roleId: pgInteger("role_id").notNull(),
    permissionId: pgInteger("permission_id").notNull(),
    ...pgAuditColumns(),
  },
  (table) => pgIntegerBounds("system_role_permission", table)
);

export default rolePermissionTable;
