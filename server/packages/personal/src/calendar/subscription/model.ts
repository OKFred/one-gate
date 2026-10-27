import { type InferSelectModel, sql } from "drizzle-orm";
import {
  check,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

export const calendarSubscriptionTable = sqliteTable(
  "personal_calendar_subscription",
  {
    ownerUserId: integer("owner_user_id").primaryKey().notNull(),
    tokenHash: text("token_hash"),
    version: integer("version").notNull(),
    createTimeUtc: integer("create_time_utc").notNull(),
    updateTimeUtc: integer("update_time_utc").notNull(),
  },
  (table) => [
    uniqueIndex("personal_calendar_subscription_token_unique").on(
      table.tokenHash
    ),
    check(
      "personal_calendar_subscription_owner_check",
      sql`${table.ownerUserId} > 0`
    ),
    check(
      "personal_calendar_subscription_version_check",
      sql`${table.version} >= 1`
    ),
    check(
      "personal_calendar_subscription_token_check",
      sql`${table.tokenHash} IS NULL OR (length(${table.tokenHash}) = 64 AND ${table.tokenHash} NOT GLOB '*[^0-9a-f]*')`
    ),
  ]
);

export type CalendarSubscriptionRecord = InferSelectModel<
  typeof calendarSubscriptionTable
>;
export const CALENDAR_SUBSCRIPTION_PATH = "/calendar-subscription.ics";
export const CALENDAR_SUBSCRIPTION_MAX_EVENTS = 1000;
export const CALENDAR_SUBSCRIPTION_MAX_BYTES = 2 * 1024 * 1024;
export const CALENDAR_SUBSCRIPTION_TOKEN_PREFIX = "ogcal1_";

const timestampSchema = {
  type: "integer",
  minimum: 0,
  maximum: 8640000000000000,
} as const;
const versionSchema = {
  type: "integer",
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER - 1,
} as const;
const nullableVersion = {
  ...versionSchema,
  type: ["integer", "null"],
} as const;
const emptySchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarSubscriptionStatusRequestSchema = emptySchema;
export const CalendarSubscriptionMutationRequestSchema = {
  type: "object",
  properties: { expectedVersion: nullableVersion },
  required: ["expectedVersion"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarSubscriptionStatusResponseSchema = {
  type: "object",
  properties: {
    configured: { type: "boolean" },
    enabled: { type: "boolean" },
    version: nullableVersion,
    updatedTimeUtc: { ...timestampSchema, type: ["integer", "null"] },
  },
  required: ["configured", "enabled", "version", "updatedTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarSubscriptionMutationResponseSchema = {
  type: "object",
  properties: { version: versionSchema, updatedTimeUtc: timestampSchema },
  required: ["version", "updatedTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarSubscriptionRotateResponseSchema = {
  ...CalendarSubscriptionMutationResponseSchema,
  properties: {
    ...CalendarSubscriptionMutationResponseSchema.properties,
    subscriptionUrl: { type: "string", format: "uri" },
  },
  required: ["version", "updatedTimeUtc", "subscriptionUrl"],
} as const satisfies JSONSchema;

export type CalendarSubscriptionStatusRequest = FromSchema<typeof emptySchema>;
export type CalendarSubscriptionMutationRequest = FromSchema<
  typeof CalendarSubscriptionMutationRequestSchema
>;
export type CalendarSubscriptionStatus = FromSchema<
  typeof CalendarSubscriptionStatusResponseSchema
>;
export type CalendarSubscriptionMutation = FromSchema<
  typeof CalendarSubscriptionMutationResponseSchema
>;
export type CalendarSubscriptionRotation = FromSchema<
  typeof CalendarSubscriptionRotateResponseSchema
>;
