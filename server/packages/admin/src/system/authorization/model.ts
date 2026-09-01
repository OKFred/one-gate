import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AuthorizationConnectionStatus } from "./domain/authorization.js";

export const authorizationConnectionTable = sqliteTable(
  "system_authorization_connection",
  {
    id: text("id").$type<"default">().primaryKey(),
    issuer: text("issuer").notNull(),
    authorizationBaseUrl: text("authorization_base_url").notNull(),
    audience: text("audience").notNull(),
    clientId: text("client_id").notNull(),
    encryptedClientSecret: text("encrypted_client_secret").notNull(),
    cloudflareAccessClientId: text("cloudflare_access_client_id"),
    encryptedCloudflareAccessClientSecret: text(
      "encrypted_cloudflare_access_client_secret"
    ),
    status: text("status").$type<AuthorizationConnectionStatus>().notNull(),
    configVersion: integer("config_version").notNull(),
    lastTestedAtUtc: integer("last_tested_at_utc"),
    updatedByUserId: integer("updated_by_user_id").notNull(),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    check(
      "system_authorization_connection_singleton_check",
      sql`${table.id} = 'default'`
    ),
    check(
      "system_authorization_connection_status_check",
      sql`${table.status} IN ('draft', 'ready', 'disabled')`
    ),
    check(
      "system_authorization_connection_version_check",
      sql`${table.configVersion} > 0`
    ),
  ]
);
