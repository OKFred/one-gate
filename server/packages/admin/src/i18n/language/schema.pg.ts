import { pgTable, text, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const languageTable = pgTable(
  "i18n_language",
  {
    id: pgIdentity(),
    langCode: text("lang_code").notNull(),
    nativeName: text("native_name").notNull(),
    isEnabled: boolean("is_enabled").notNull(),
    sortOrder: pgInteger("sort_order").notNull(),
    remark: text("remark"),
    ...pgAuditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("i18n_language", table),
    uniqueIndex("idx_language_code").on(table.langCode),
  ]
);

export default languageTable;
