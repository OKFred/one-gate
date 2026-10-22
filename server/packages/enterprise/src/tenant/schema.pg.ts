import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  boolean,
  index,
  uniqueIndex,
  check,
  foreignKey,
} from "drizzle-orm/pg-core";
import {
  pgIdentity,
  pgInteger,
  pgIntegerBounds,
} from "@hodor/core/db/postgresql/columns";
import type { TenantRole } from "./model";

function auditColumns() {
  return {
    creatorId: pgInteger("creator_id").notNull(),
    updaterId: pgInteger("updater_id"),
    createTimeUtc: pgInteger("create_time_utc").notNull(),
    updateTimeUtc: pgInteger("update_time_utc").notNull(),
  };
}

export const tenantTable = pgTable(
  "enterprise_tenant",
  {
    id: pgIdentity(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    isEnabled: boolean("is_enabled").notNull(),
    recoveryReason: text("recovery_reason"),
    ...auditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("enterprise_tenant", table),
    uniqueIndex("enterprise_tenant_key_unique").on(table.key),
    check(
      "enterprise_tenant_key_check",
      sql`${table.key} ~ '^[a-z0-9][a-z0-9_-]{1,63}$'`
    ),
  ]
);

export const tenantMemberTable = pgTable(
  "enterprise_tenant_member",
  {
    id: pgIdentity(),
    tenantId: pgInteger("tenant_id")
      .notNull()
      .references(() => tenantTable.id),
    userId: pgInteger("user_id").notNull(),
    role: text("role").$type<TenantRole>().notNull(),
    isEnabled: boolean("is_enabled").notNull(),
    ...auditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("enterprise_tenant_member", table),
    uniqueIndex("enterprise_tenant_member_tenant_user_unique").on(
      table.tenantId,
      table.userId
    ),
    index("enterprise_tenant_member_user_idx").on(
      table.userId,
      table.isEnabled
    ),
    check(
      "enterprise_tenant_member_role_check",
      sql`${table.role} IN ('owner','admin','editor','viewer')`
    ),
  ]
);

export const tenantApiTokenGrantTable = pgTable(
  "enterprise_tenant_api_token_grant",
  {
    id: pgIdentity(),
    tenantId: pgInteger("tenant_id").notNull(),
    tokenId: pgInteger("token_id").notNull(),
    isEnabled: boolean("is_enabled").notNull(),
    ...auditColumns(),
  },
  (table) => [
    ...pgIntegerBounds("enterprise_tenant_api_token_grant", table),
    foreignKey({
      columns: [table.tenantId],
      foreignColumns: [tenantTable.id],
      name: "enterprise_tenant_token_grant_tenant_fk",
    }),
    uniqueIndex("enterprise_tenant_api_token_grant_token_unique").on(
      table.tokenId
    ),
    index("enterprise_tenant_api_token_grant_tenant_idx").on(
      table.tenantId,
      table.isEnabled
    ),
  ]
);
