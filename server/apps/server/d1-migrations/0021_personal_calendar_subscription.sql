CREATE TABLE IF NOT EXISTS `personal_calendar_subscription` (
	`owner_user_id` integer PRIMARY KEY NOT NULL,
	`token_hash` text,
	`version` integer NOT NULL,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	CONSTRAINT "personal_calendar_subscription_owner_check" CHECK("personal_calendar_subscription"."owner_user_id" > 0),
	CONSTRAINT "personal_calendar_subscription_version_check" CHECK("personal_calendar_subscription"."version" >= 1),
	CONSTRAINT "personal_calendar_subscription_token_check" CHECK("personal_calendar_subscription"."token_hash" IS NULL OR (length("personal_calendar_subscription"."token_hash") = 64 AND "personal_calendar_subscription"."token_hash" NOT GLOB '*[^0-9a-f]*'))
);

CREATE UNIQUE INDEX IF NOT EXISTS `personal_calendar_subscription_token_unique` ON `personal_calendar_subscription` (`token_hash`);

-- Read-only personal calendar subscription schema contract, generated from its targeted Drizzle schema.

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='personal_calendar_subscription' AND sql='CREATE TABLE `personal_calendar_subscription` (
	`owner_user_id` integer PRIMARY KEY NOT NULL,
	`token_hash` text,
	`version` integer NOT NULL,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	CONSTRAINT "personal_calendar_subscription_owner_check" CHECK("personal_calendar_subscription"."owner_user_id" > 0),
	CONSTRAINT "personal_calendar_subscription_version_check" CHECK("personal_calendar_subscription"."version" >= 1),
	CONSTRAINT "personal_calendar_subscription_token_check" CHECK("personal_calendar_subscription"."token_hash" IS NULL OR (length("personal_calendar_subscription"."token_hash") = 64 AND "personal_calendar_subscription"."token_hash" NOT GLOB ''*[^0-9a-f]*''))
)')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='personal_calendar_subscription_token_unique' AND sql='CREATE UNIQUE INDEX `personal_calendar_subscription_token_unique` ON `personal_calendar_subscription` (`token_hash`)')
  AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE tbl_name='personal_calendar_subscription' AND type='trigger')
  AND (SELECT count(*) FROM sqlite_master WHERE tbl_name='personal_calendar_subscription' AND type='index' AND sql IS NOT NULL)=1 THEN '{}' ELSE 'invalid personal_calendar_subscription schema' END) AS personal_calendar_subscription_contract;
