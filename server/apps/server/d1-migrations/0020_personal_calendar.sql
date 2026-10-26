CREATE TABLE IF NOT EXISTS `personal_calendar_event` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` integer NOT NULL,
	`request_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text,
	`start_time_utc` integer NOT NULL,
	`end_time_utc` integer,
	`time_zone` text NOT NULL,
	`reminder_time_utc` integer,
	`reminder_acknowledged_time_utc` integer,
	`status` text NOT NULL,
	`version` integer NOT NULL,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	CONSTRAINT "personal_calendar_event_status_check" CHECK("personal_calendar_event"."status" IN ('active', 'cancelled')),
	CONSTRAINT "personal_calendar_event_version_check" CHECK("personal_calendar_event"."version" >= 1),
	CONSTRAINT "personal_calendar_event_interval_check" CHECK("personal_calendar_event"."end_time_utc" IS NULL OR "personal_calendar_event"."end_time_utc" >= "personal_calendar_event"."start_time_utc"),
	CONSTRAINT "personal_calendar_event_reminder_check" CHECK("personal_calendar_event"."reminder_time_utc" IS NULL OR "personal_calendar_event"."reminder_time_utc" <= "personal_calendar_event"."start_time_utc")
);

CREATE UNIQUE INDEX IF NOT EXISTS `personal_calendar_event_owner_request_unique` ON `personal_calendar_event` (`owner_user_id`,`request_key`);

CREATE INDEX IF NOT EXISTS `personal_calendar_event_owner_start_idx` ON `personal_calendar_event` (`owner_user_id`,`start_time_utc`,`id`);

CREATE INDEX IF NOT EXISTS `personal_calendar_event_owner_reminder_idx` ON `personal_calendar_event` (`owner_user_id`,`reminder_time_utc`,`id`) WHERE "personal_calendar_event"."status" = 'active' AND "personal_calendar_event"."reminder_acknowledged_time_utc" IS NULL AND "personal_calendar_event"."reminder_time_utc" IS NOT NULL;

-- Read-only personal calendar schema contract, generated from its targeted Drizzle schema.

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='personal_calendar_event' AND sql='CREATE TABLE `personal_calendar_event` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` integer NOT NULL,
	`request_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`url` text,
	`start_time_utc` integer NOT NULL,
	`end_time_utc` integer,
	`time_zone` text NOT NULL,
	`reminder_time_utc` integer,
	`reminder_acknowledged_time_utc` integer,
	`status` text NOT NULL,
	`version` integer NOT NULL,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	CONSTRAINT "personal_calendar_event_status_check" CHECK("personal_calendar_event"."status" IN (''active'', ''cancelled'')),
	CONSTRAINT "personal_calendar_event_version_check" CHECK("personal_calendar_event"."version" >= 1),
	CONSTRAINT "personal_calendar_event_interval_check" CHECK("personal_calendar_event"."end_time_utc" IS NULL OR "personal_calendar_event"."end_time_utc" >= "personal_calendar_event"."start_time_utc"),
	CONSTRAINT "personal_calendar_event_reminder_check" CHECK("personal_calendar_event"."reminder_time_utc" IS NULL OR "personal_calendar_event"."reminder_time_utc" <= "personal_calendar_event"."start_time_utc")
)')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='personal_calendar_event_owner_request_unique' AND sql='CREATE UNIQUE INDEX `personal_calendar_event_owner_request_unique` ON `personal_calendar_event` (`owner_user_id`,`request_key`)')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='personal_calendar_event_owner_start_idx' AND sql='CREATE INDEX `personal_calendar_event_owner_start_idx` ON `personal_calendar_event` (`owner_user_id`,`start_time_utc`,`id`)')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='personal_calendar_event_owner_reminder_idx' AND sql='CREATE INDEX `personal_calendar_event_owner_reminder_idx` ON `personal_calendar_event` (`owner_user_id`,`reminder_time_utc`,`id`) WHERE "personal_calendar_event"."status" = ''active'' AND "personal_calendar_event"."reminder_acknowledged_time_utc" IS NULL AND "personal_calendar_event"."reminder_time_utc" IS NOT NULL')
  AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE tbl_name='personal_calendar_event' AND type='trigger')
  AND (SELECT count(*) FROM sqlite_master WHERE tbl_name='personal_calendar_event' AND type='index' AND sql IS NOT NULL)=3 THEN '{}' ELSE 'invalid personal_calendar_event schema' END) AS personal_calendar_event_contract;
