import { pgTable, text, boolean, index } from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const complianceArchiveTable = pgTable(
  "compliance_archives",
  {
    id: pgIdentity(),
    sourceSystem: text("source_system").notNull(),
    sourceDatabase: text("source_database").notNull(),
    sourceTable: text("source_table").notNull(),
    sourcePrimaryKey: text("source_primary_key").notNull(),
    deleteReason: text("delete_reason"),
    deleteType: text("delete_type"),
    recordSnapshot: text("record_snapshot"),
    remark: text("remark"),
    restorable: boolean("restorable").notNull(),
    restoreUntilTimeUtc: pgInteger("restore_until_time_utc"),
    restoredTimeUtc: pgInteger("restored_time_utc"),
    restorerId: pgInteger("restorer_id"),
    complianceNote: text("compliance_note"),
    ...pgAuditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("compliance_archives", table),
    index("compliance_archives_department_retention_idx").on(
      table.sourceSystem,
      table.sourceDatabase,
      table.sourceTable,
      table.createTimeUtc
    ),
  ]
);

export default complianceArchiveTable;
