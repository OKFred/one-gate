import { pgTable, text, boolean } from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const menuTable = pgTable(
  "system_menu",
  {
    id: pgIdentity(),
    name: text("name").notNull(),
    icon: text("icon").notNull(),
    path: text("path"),
    parentId: pgInteger("parent_id"),
    sort: pgInteger("sort").notNull(),
    business: text("business").notNull(),
    remark: text("remark"),
    isEnabled: boolean("is_enabled").notNull(),
    ...pgAuditColumns(),
  },
  (table) => pgIntegerBounds("system_menu", table)
);

export default menuTable;
