import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

type LegacyOAuthProvider = "github" | "feishu";
type LegacyOAuthIntent = "login" | "bind" | "unbind";

export const oauthStateTable = sqliteTable(
  "system_oauth_state",
  {
    stateDigest: text("state_digest").primaryKey(),
    provider: text("provider").$type<LegacyOAuthProvider>().notNull(),
    intent: text("intent").$type<LegacyOAuthIntent>().notNull(),
    redirectUri: text("redirect_uri").notNull(),
    userId: integer("user_id"),
    expiresAtUtc: integer("expires_at_utc").notNull(),
    consumedAtUtc: integer("consumed_at_utc"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
  },
  (table) => [index("system_oauth_state_expiry_idx").on(table.expiresAtUtc)]
);
