CREATE TABLE "personal_calendar_event" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" bigint NOT NULL,
	"request_key" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"start_time_utc" bigint NOT NULL,
	"end_time_utc" bigint,
	"time_zone" text NOT NULL,
	"reminder_time_utc" bigint,
	"reminder_acknowledged_time_utc" bigint,
	"status" text NOT NULL,
	"version" bigint NOT NULL,
	"create_time_utc" bigint NOT NULL,
	"update_time_utc" bigint NOT NULL,
	CONSTRAINT "personal_calendar_event_status_check" CHECK ("personal_calendar_event"."status" IN ('active', 'cancelled')),
	CONSTRAINT "personal_calendar_event_version_check" CHECK ("personal_calendar_event"."version" >= 1),
	CONSTRAINT "personal_calendar_event_interval_check" CHECK ("personal_calendar_event"."end_time_utc" IS NULL OR "personal_calendar_event"."end_time_utc" >= "personal_calendar_event"."start_time_utc"),
	CONSTRAINT "personal_calendar_event_reminder_check" CHECK ("personal_calendar_event"."reminder_time_utc" IS NULL OR "personal_calendar_event"."reminder_time_utc" <= "personal_calendar_event"."start_time_utc"),
	CONSTRAINT "personal_calendar_event_safe_owner_user_id" CHECK ("personal_calendar_event"."owner_user_id" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_event_safe_start_time_utc" CHECK ("personal_calendar_event"."start_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_event_safe_end_time_utc" CHECK ("personal_calendar_event"."end_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_event_safe_reminder_time_utc" CHECK ("personal_calendar_event"."reminder_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_event_safe_reminder_acknowledged_time_utc" CHECK ("personal_calendar_event"."reminder_acknowledged_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_event_safe_version" CHECK ("personal_calendar_event"."version" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_event_safe_create_time_utc" CHECK ("personal_calendar_event"."create_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_event_safe_update_time_utc" CHECK ("personal_calendar_event"."update_time_utc" BETWEEN -9007199254740991 AND 9007199254740991)
);

CREATE UNIQUE INDEX "personal_calendar_event_owner_request_unique" ON "personal_calendar_event" USING btree ("owner_user_id","request_key");

CREATE INDEX "personal_calendar_event_owner_start_idx" ON "personal_calendar_event" USING btree ("owner_user_id","start_time_utc","id");

CREATE INDEX "personal_calendar_event_owner_reminder_idx" ON "personal_calendar_event" USING btree ("owner_user_id","reminder_time_utc","id") WHERE "personal_calendar_event"."status" = 'active' AND "personal_calendar_event"."reminder_acknowledged_time_utc" IS NULL AND "personal_calendar_event"."reminder_time_utc" IS NOT NULL;
