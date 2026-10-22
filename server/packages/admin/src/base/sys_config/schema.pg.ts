import { pgTable, text, boolean, jsonb, index } from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const baseSysConfigTable = pgTable(
  "base_sys_config",
  {
    id: pgIdentity(),
    namespace: text("namespace").notNull(),
    configKey: text("config_key").notNull(),
    isEnabled: boolean("is_enabled").notNull(),
    isPrimary: boolean("is_primary").notNull(),
    configValue: jsonb("config_value").notNull(),
    remark: text("remark"),
    ...pgAuditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("base_sys_config", table),
    index("idx_base_sys_config_namespace").on(table.namespace),
  ]
);

export default baseSysConfigTable;
