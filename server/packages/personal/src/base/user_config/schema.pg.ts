import { pgTable, text, boolean, jsonb, index } from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const baseUserConfigTable = pgTable(
  "base_user_config",
  {
    id: pgIdentity(),
    userId: pgInteger("user_id").notNull(),
    namespace: text("namespace").notNull(),
    configKey: text("config_key").notNull(),
    isEnabled: boolean("is_enabled").notNull(),
    isPrimary: boolean("is_primary").notNull(),
    configValue: jsonb("config_value").notNull(),
    remark: text("remark"),
    ...pgAuditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("base_user_config", table),
    index("idx_base_user_config_tenant_namespace").on(
      table.userId,
      table.namespace
    ),
  ]
);

export default baseUserConfigTable;
