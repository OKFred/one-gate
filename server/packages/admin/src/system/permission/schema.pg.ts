import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const permissionTable = pgTable(
  "system_permission",
  {
    id: pgIdentity(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    resource: text("resource"),
    business: text("business"),
    remark: text("remark"),
    isEnabled: boolean("is_enabled").notNull(),
    ...pgAuditColumns(),
  },
  (table) => pgIntegerBounds("system_permission", table)
);

export default permissionTable;
