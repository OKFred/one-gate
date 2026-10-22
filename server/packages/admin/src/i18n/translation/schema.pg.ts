import {
  pgTable,
  text,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const translationTable = pgTable(
  "i18n_translation",
  {
    id: pgIdentity(),
    application: text("application").notNull(),
    business: text("business").notNull(),
    langCode: text("lang_code").notNull(),
    tKey: text("t_key").notNull(),
    tValue: text("t_value").notNull(),
    valueHash: text("value_hash").notNull(),
    remark: text("remark"),
    isEnabled: boolean("is_enabled").notNull(),
    ...pgAuditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("i18n_translation", table),
    index("idx_value_hash").on(table.valueHash),
    uniqueIndex("idx_unique_tkey_langcode").on(table.tKey, table.langCode),
  ]
);

export default translationTable;
