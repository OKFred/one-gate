import {
  pgTable,
  text,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const regionTable = pgTable(
  "i18n_region",
  {
    id: pgIdentity(),
    labels: jsonb("labels").$type<Record<string, string>>(),
    alpha2Code: text("alpha2_code").notNull(),
    alpha3Code: text("alpha3_code").notNull(),
    numeric: pgInteger("numeric").notNull(),
    iso3166Independent: boolean("iso_3166_independent").notNull(),
    businessLanguages: jsonb("business_languages").$type<string[]>(),
    isEnabled: boolean("is_enabled").notNull(),
    remark: text("remark"),
    ...pgAuditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("i18n_region", table),
    uniqueIndex("idx_region_numeric").on(table.numeric),
    uniqueIndex("idx_region_alpha2").on(table.alpha2Code),
    uniqueIndex("idx_region_alpha3").on(table.alpha3Code),
  ]
);

export default regionTable;
