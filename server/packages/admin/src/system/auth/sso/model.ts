import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { SsoConnectionStatus, SsoIntent } from "./domain/sso.js";

export const ssoConnectionTable = sqliteTable(
  "system_sso_connection",
  {
    id: text("id").$type<"default">().primaryKey(),
    issuer: text("issuer").notNull(),
    clientId: text("client_id").notNull(),
    audience: text("audience").notNull(),
    allowedTenantId: text("allowed_tenant_id").notNull(),
    redirectUrisJson: text("redirect_uris_json", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    status: text("status").$type<SsoConnectionStatus>().notNull(),
    configVersion: integer("config_version").notNull(),
    lastTestedAtUtc: integer("last_tested_at_utc"),
    updatedByUserId: integer("updated_by_user_id"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    check(
      "system_sso_connection_singleton_check",
      sql`${table.id} = 'default'`
    ),
    check(
      "system_sso_connection_status_check",
      sql`${table.status} IN ('draft', 'ready', 'disabled')`
    ),
    check(
      "system_sso_connection_version_check",
      sql`${table.configVersion} > 0`
    ),
  ]
);

export const userSsoIdentityTable = sqliteTable(
  "system_user_sso_identity",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    issuer: text("issuer").notNull(),
    subject: text("subject").notNull(),
    principalUserId: text("principal_user_id").notNull(),
    tenantId: text("tenant_id").notNull(),
    membershipId: text("membership_id").notNull(),
    clientId: text("client_id").notNull(),
    amr: text("amr", { mode: "json" }).$type<string[]>().notNull(),
    scope: text("scope", { mode: "json" }).$type<string[]>().notNull(),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
    updateTimeUtc: integer("update_time_utc"),
  },
  (table) => [
    uniqueIndex("system_user_sso_identity_issuer_subject_unique").on(
      table.issuer,
      table.subject
    ),
    uniqueIndex("system_user_sso_identity_user_issuer_unique").on(
      table.userId,
      table.issuer
    ),
  ]
);

export const ssoOidcTransactionTable = sqliteTable(
  "system_sso_oidc_transaction",
  {
    id: text("id").primaryKey(),
    stateDigest: text("state_digest").notNull(),
    intent: text("intent").$type<SsoIntent>().notNull(),
    expectedUserId: integer("expected_user_id"),
    issuer: text("issuer").notNull(),
    clientId: text("client_id").notNull(),
    tenantId: text("tenant_id").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    encryptedCodeVerifier: text("encrypted_code_verifier").notNull(),
    nonceDigest: text("nonce_digest").notNull(),
    expiresAtUtc: integer("expires_at_utc").notNull(),
    consumedAtUtc: integer("consumed_at_utc"),
    createTimeUtc: integer("create_time_utc")
      .notNull()
      .default(getCurrentTimestampUtcSql()),
  },
  (table) => [
    uniqueIndex("system_sso_oidc_transaction_state_unique").on(
      table.stateDigest
    ),
    index("system_sso_oidc_transaction_expiry_idx").on(table.expiresAtUtc),
  ]
);
