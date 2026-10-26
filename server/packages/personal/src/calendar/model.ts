import { type InferSelectModel, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

export const calendarEventTable = sqliteTable(
  "personal_calendar_event",
  {
    id: text("id").primaryKey(),
    ownerUserId: integer("owner_user_id").notNull(),
    requestKey: text("request_key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url"),
    startTimeUtc: integer("start_time_utc").notNull(),
    endTimeUtc: integer("end_time_utc"),
    timeZone: text("time_zone").notNull(),
    reminderTimeUtc: integer("reminder_time_utc"),
    reminderAcknowledgedTimeUtc: integer("reminder_acknowledged_time_utc"),
    status: text("status", { enum: ["active", "cancelled"] }).notNull(),
    version: integer("version").notNull(),
    createTimeUtc: integer("create_time_utc").notNull(),
    updateTimeUtc: integer("update_time_utc").notNull(),
  },
  (table) => [
    uniqueIndex("personal_calendar_event_owner_request_unique").on(
      table.ownerUserId,
      table.requestKey
    ),
    index("personal_calendar_event_owner_start_idx").on(
      table.ownerUserId,
      table.startTimeUtc,
      table.id
    ),
    index("personal_calendar_event_owner_reminder_idx")
      .on(table.ownerUserId, table.reminderTimeUtc, table.id)
      .where(
        sql`${table.status} = 'active' AND ${table.reminderAcknowledgedTimeUtc} IS NULL AND ${table.reminderTimeUtc} IS NOT NULL`
      ),
    check(
      "personal_calendar_event_status_check",
      sql`${table.status} IN ('active', 'cancelled')`
    ),
    check("personal_calendar_event_version_check", sql`${table.version} >= 1`),
    check(
      "personal_calendar_event_interval_check",
      sql`${table.endTimeUtc} IS NULL OR ${table.endTimeUtc} >= ${table.startTimeUtc}`
    ),
    check(
      "personal_calendar_event_reminder_check",
      sql`${table.reminderTimeUtc} IS NULL OR ${table.reminderTimeUtc} <= ${table.startTimeUtc}`
    ),
  ]
);

export type CalendarEventRecord = InferSelectModel<typeof calendarEventTable>;
export type CalendarEventInsert = typeof calendarEventTable.$inferInsert;

export const CALENDAR_MAX_RANGE_MS = 93 * 24 * 60 * 60 * 1000;
export const CALENDAR_LIST_LIMIT = 500;
export const CALENDAR_DUE_LIMIT = 20;
export const CALENDAR_UPCOMING_LIMIT = 5;

const timestampSchema = {
  type: "integer",
  minimum: 0,
  maximum: 8640000000000000,
} as const;
const nullableTimestampSchema = {
  ...timestampSchema,
  type: ["integer", "null"],
} as const;
const uuidSchema = {
  type: "string",
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
} as const;
const versionSchema = {
  type: "integer",
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER - 1,
} as const;

export const CalendarEditableProperties = {
  title: { type: "string", minLength: 1, maxLength: 160 },
  description: { type: ["string", "null"], maxLength: 4000 },
  url: { type: ["string", "null"], maxLength: 2048 },
  startTimeUtc: timestampSchema,
  endTimeUtc: nullableTimestampSchema,
  timeZone: { type: "string", minLength: 1, maxLength: 100 },
  reminderTimeUtc: nullableTimestampSchema,
} as const satisfies Record<string, JSONSchema>;

export const CalendarEventResponseSchema = {
  type: "object",
  properties: {
    id: uuidSchema,
    ...CalendarEditableProperties,
    reminderAcknowledgedTimeUtc: nullableTimestampSchema,
    status: { type: "string", enum: ["active", "cancelled"] },
    version: versionSchema,
    createTimeUtc: timestampSchema,
    updateTimeUtc: timestampSchema,
  },
  required: [
    "id",
    "title",
    "description",
    "url",
    "startTimeUtc",
    "endTimeUtc",
    "timeZone",
    "reminderTimeUtc",
    "reminderAcknowledgedTimeUtc",
    "status",
    "version",
    "createTimeUtc",
    "updateTimeUtc",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;

export const CalendarListRequestSchema = {
  type: "object",
  properties: { fromTimeUtc: timestampSchema, toTimeUtc: timestampSchema },
  required: ["fromTimeUtc", "toTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarListResponseSchema = {
  type: "object",
  properties: {
    list: { type: "array", items: CalendarEventResponseSchema },
    hasMore: { type: "boolean" },
    upcoming: { type: "array", items: CalendarEventResponseSchema },
  },
  required: ["list", "hasMore", "upcoming"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarGetRequestSchema = {
  type: "object",
  properties: { id: uuidSchema },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarAddRequestSchema = {
  type: "object",
  properties: { requestKey: uuidSchema, ...CalendarEditableProperties },
  required: ["requestKey", "title", "startTimeUtc", "timeZone"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarUpdateRequestSchema = {
  type: "object",
  properties: {
    id: uuidSchema,
    expectedVersion: versionSchema,
    ...CalendarEditableProperties,
  },
  required: [
    "id",
    "expectedVersion",
    "title",
    "startTimeUtc",
    "timeZone",
    "description",
    "url",
    "endTimeUtc",
    "reminderTimeUtc",
  ],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarCancelRequestSchema = {
  type: "object",
  properties: { id: uuidSchema, expectedVersion: versionSchema },
  required: ["id", "expectedVersion"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarCancelResponseSchema = {
  type: "object",
  properties: { id: uuidSchema },
  required: ["id"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarDueRequestSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarDueResponseSchema = {
  type: "object",
  properties: {
    list: { type: "array", items: CalendarEventResponseSchema },
    hasMore: { type: "boolean" },
    nextReminderTimeUtc: nullableTimestampSchema,
    serverTimeUtc: timestampSchema,
  },
  required: ["list", "hasMore", "nextReminderTimeUtc", "serverTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarAckRequestSchema = {
  type: "object",
  properties: {
    id: uuidSchema,
    expectedVersion: versionSchema,
    expectedReminderTimeUtc: timestampSchema,
  },
  required: ["id", "expectedVersion", "expectedReminderTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;
export const CalendarAckResponseSchema = {
  type: "object",
  properties: { id: uuidSchema, acknowledgedTimeUtc: timestampSchema },
  required: ["id", "acknowledgedTimeUtc"],
  additionalProperties: false,
} as const satisfies JSONSchema;

export type CalendarEvent = FromSchema<typeof CalendarEventResponseSchema>;
export type CalendarListRequest = FromSchema<typeof CalendarListRequestSchema>;
export type CalendarListResponse = FromSchema<
  typeof CalendarListResponseSchema
>;
export type CalendarGetRequest = FromSchema<typeof CalendarGetRequestSchema>;
export type CalendarAddRequest = FromSchema<typeof CalendarAddRequestSchema>;
export type CalendarUpdateRequest = FromSchema<
  typeof CalendarUpdateRequestSchema
>;
export type CalendarCancelRequest = FromSchema<
  typeof CalendarCancelRequestSchema
>;
export type CalendarCancelResponse = FromSchema<
  typeof CalendarCancelResponseSchema
>;
export type CalendarDueRequest = FromSchema<typeof CalendarDueRequestSchema>;
export type CalendarDueResponse = FromSchema<typeof CalendarDueResponseSchema>;
export type CalendarAckRequest = FromSchema<typeof CalendarAckRequestSchema>;
export type CalendarAckResponse = FromSchema<typeof CalendarAckResponseSchema>;
export type CalendarEditable = Pick<
  CalendarEventRecord,
  | "title"
  | "description"
  | "url"
  | "startTimeUtc"
  | "endTimeUtc"
  | "timeZone"
  | "reminderTimeUtc"
>;

export default calendarEventTable;
