import { pgTable, text } from "drizzle-orm/pg-core";
import {
  pgAuditColumns,
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";

export const apiTokenTable = pgTable(
  "system_api_token",
  {
    id: pgIdentity(),
    name: text("name").notNull(),
    tokenPrefix: text("token_prefix").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    permissions: text("permissions").notNull(),
    ipWhitelist: text("ip_whitelist"),
    startTimeUtc: pgInteger("start_time_utc"),
    expireTimeUtc: pgInteger("expire_time_utc"),
    lastUsedTimeUtc: pgInteger("last_used_time_utc"),
    status: text("status").notNull(),
    remark: text("remark"),
    ...pgAuditColumns(),
  },
  (table) => pgIntegerBounds("system_api_token", table)
);

export default apiTokenTable;
