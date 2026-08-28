import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { OAuthIntent, OAuthProvider } from "./domain/oauth.js";

export const oauthStateTable = sqliteTable(
  "system_oauth_state",
  {
    stateDigest: text("state_digest").primaryKey(),
    provider: text("provider").$type<OAuthProvider>().notNull(),
    intent: text("intent").$type<OAuthIntent>().notNull(),
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
