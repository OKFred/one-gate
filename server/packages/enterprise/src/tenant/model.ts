import { sql, type InferSelectModel } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { JSONSchema, FromSchema } from "json-schema-to-ts";

export const tenantRoles = ["owner", "admin", "editor", "viewer"] as const;
export type TenantRole = (typeof tenantRoles)[number];

function auditColumns() {
  return {
    creatorId: integer("creator_id").notNull(),
    updaterId: integer("updater_id"),
    createTimeUtc: integer("create_time_utc").notNull(),
    updateTimeUtc: integer("update_time_utc").notNull(),
  };
}

export const tenantTable = sqliteTable(
  "enterprise_tenant",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    recoveryReason: text("recovery_reason"),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("enterprise_tenant_key_unique").on(table.key),
    check("enterprise_tenant_enabled_check", sql`${table.isEnabled} IN (0,1)`),
    check(
      "enterprise_tenant_key_check",
      sql`length(${table.key}) BETWEEN 2 AND 64 AND ${table.key} NOT GLOB '*[^a-z0-9_-]*'`
    ),
  ]
);

export const tenantMemberTable = sqliteTable(
  "enterprise_tenant_member",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantTable.id),
    userId: integer("user_id").notNull(),
    role: text("role").$type<TenantRole>().notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    ...auditColumns(),
  },
  (table) => [
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
    check(
      "enterprise_tenant_member_enabled_check",
      sql`${table.isEnabled} IN (0,1)`
    ),
  ]
);

export const tenantApiTokenGrantTable = sqliteTable(
  "enterprise_tenant_api_token_grant",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantTable.id),
    tokenId: integer("token_id").notNull(),
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull(),
    ...auditColumns(),
  },
  (table) => [
    uniqueIndex("enterprise_tenant_api_token_grant_token_unique").on(
      table.tokenId
    ),
    index("enterprise_tenant_api_token_grant_tenant_idx").on(
      table.tenantId,
      table.isEnabled
    ),
    check(
      "enterprise_tenant_api_token_grant_enabled_check",
      sql`${table.isEnabled} IN (0,1)`
    ),
  ]
);

export type TenantRecord = InferSelectModel<typeof tenantTable>;
export type TenantMemberRecord = InferSelectModel<typeof tenantMemberTable>;
export type TenantApiTokenGrantRecord = InferSelectModel<
  typeof tenantApiTokenGrantTable
>;

const id = {
  type: "integer",
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
} as const;
const timestamp = {
  type: "integer",
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
} as const;
const expectedVersion = {
  type: ["integer", "null"],
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
} as const;
const audit = {
  creatorId: id,
  updaterId: {
    type: ["integer", "null"],
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  },
  createTimeUtc: timestamp,
  updateTimeUtc: timestamp,
} as const;
const pagination = {
  pageNo: { type: "integer", minimum: 1 },
  pageSize: { type: "integer", minimum: 1, maximum: 1000 },
} as const;
const tenantProperties = {
  id,
  key: { type: "string", pattern: "^[a-z0-9][a-z0-9_-]{1,63}$", maxLength: 64 },
  name: { type: "string", minLength: 1, maxLength: 200 },
  isEnabled: { type: "boolean" },
  memberRole: { type: ["string", "null"], enum: [...tenantRoles, null] },
  frozen: { type: "boolean" },
  ...audit,
} as const;
const memberProperties = {
  id,
  tenantId: id,
  userId: id,
  username: { type: ["string", "null"] },
  userIsEnabled: { type: "boolean" },
  role: { type: "string", enum: tenantRoles },
  isEnabled: { type: "boolean" },
  ...audit,
} as const;
const grantProperties = {
  id,
  tenantId: id,
  tokenId: id,
  isEnabled: { type: "boolean" },
  ...audit,
} as const;

export const TenantListReq = {
  type: "object",
  properties: {
    ...pagination,
    keyword: { type: "string", maxLength: 200 },
    orderBy: { type: "string", enum: ["id", "key", "name", "createTimeUtc"] },
    descend: { type: "boolean" },
  },
  required: [],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantListRes = {
  type: "object",
  properties: {
    list: {
      type: "array",
      items: {
        type: "object",
        properties: tenantProperties,
        required: Object.keys(tenantProperties),
        additionalProperties: false,
      },
    },
    total: { type: "integer", minimum: 0 },
    totalPage: { type: "integer", minimum: 0 },
    currentPage: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1 },
    canManagePlatform: { type: "boolean" },
  },
  required: [
    "list",
    "total",
    "totalPage",
    "currentPage",
    "pageSize",
    "canManagePlatform",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantCreateReq = {
  type: "object",
  properties: {
    key: tenantProperties.key,
    name: tenantProperties.name,
    ownerUserId: id,
  },
  required: ["key", "name", "ownerUserId"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantUpdateReq = {
  type: "object",
  properties: {
    tenantId: id,
    name: tenantProperties.name,
    isEnabled: tenantProperties.isEnabled,
    expectedUpdateTimeUtc: timestamp,
  },
  required: ["tenantId", "name", "isEnabled", "expectedUpdateTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantChildrenListReq = {
  type: "object",
  properties: { tenantId: id, ...pagination },
  required: ["tenantId"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantMemberListRes = {
  type: "object",
  properties: {
    list: {
      type: "array",
      items: {
        type: "object",
        properties: memberProperties,
        required: Object.keys(memberProperties),
        additionalProperties: false,
      },
    },
    total: { type: "integer", minimum: 0 },
    totalPage: { type: "integer", minimum: 0 },
    currentPage: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1 },
  },
  required: ["list", "total", "totalPage", "currentPage", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantMemberSetReq = {
  type: "object",
  properties: {
    tenantId: id,
    userId: id,
    role: memberProperties.role,
    isEnabled: memberProperties.isEnabled,
    expectedUpdateTimeUtc: expectedVersion,
  },
  required: [
    "tenantId",
    "userId",
    "role",
    "isEnabled",
    "expectedUpdateTimeUtc",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantOwnerTransferReq = {
  type: "object",
  properties: {
    tenantId: id,
    toUserId: id,
    expectedSourceTimeUtc: timestamp,
    expectedTargetTimeUtc: timestamp,
  },
  required: [
    "tenantId",
    "toUserId",
    "expectedSourceTimeUtc",
    "expectedTargetTimeUtc",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantOwnerRecoverReq = {
  type: "object",
  properties: {
    tenantId: id,
    userId: id,
    expectedUpdateTimeUtc: timestamp,
    reason: { type: "string", minLength: 1, maxLength: 1000 },
  },
  required: ["tenantId", "userId", "expectedUpdateTimeUtc", "reason"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantTokenGrantListRes = {
  type: "object",
  properties: {
    list: {
      type: "array",
      items: {
        type: "object",
        properties: grantProperties,
        required: Object.keys(grantProperties),
        additionalProperties: false,
      },
    },
    total: { type: "integer", minimum: 0 },
    totalPage: { type: "integer", minimum: 0 },
    currentPage: { type: "integer", minimum: 1 },
    pageSize: { type: "integer", minimum: 1 },
  },
  required: ["list", "total", "totalPage", "currentPage", "pageSize"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantTokenGrantSetReq = {
  type: "object",
  properties: {
    tenantId: id,
    tokenId: id,
    isEnabled: grantProperties.isEnabled,
    expectedUpdateTimeUtc: expectedVersion,
  },
  required: ["tenantId", "tokenId", "isEnabled", "expectedUpdateTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const TenantIdRes = id;

export type TenantListInput = FromSchema<typeof TenantListReq>;
export type TenantCreateInput = FromSchema<typeof TenantCreateReq>;
export type TenantUpdateInput = FromSchema<typeof TenantUpdateReq>;
export type TenantChildrenListInput = FromSchema<typeof TenantChildrenListReq>;
export type TenantMemberSetInput = FromSchema<typeof TenantMemberSetReq>;
export type TenantOwnerTransferInput = FromSchema<
  typeof TenantOwnerTransferReq
>;
export type TenantOwnerRecoverInput = FromSchema<typeof TenantOwnerRecoverReq>;
export type TenantTokenGrantSetInput = FromSchema<
  typeof TenantTokenGrantSetReq
>;
