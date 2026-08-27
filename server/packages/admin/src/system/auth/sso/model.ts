import { getCurrentTimestampUtcSql } from "@hodor/core/utils/timestamp";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { SsoIntent } from "./domain/sso.js";

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
