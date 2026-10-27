CREATE TABLE "personal_calendar_subscription" (
	"owner_user_id" bigint PRIMARY KEY NOT NULL,
	"token_hash" text,
	"version" bigint NOT NULL,
	"create_time_utc" bigint NOT NULL,
	"update_time_utc" bigint NOT NULL,
	CONSTRAINT "personal_calendar_subscription_owner_check" CHECK ("personal_calendar_subscription"."owner_user_id" > 0),
	CONSTRAINT "personal_calendar_subscription_version_check" CHECK ("personal_calendar_subscription"."version" >= 1),
	CONSTRAINT "personal_calendar_subscription_token_check" CHECK ("personal_calendar_subscription"."token_hash" IS NULL OR "personal_calendar_subscription"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "personal_calendar_subscription_safe_owner_user_id" CHECK ("personal_calendar_subscription"."owner_user_id" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_subscription_safe_version" CHECK ("personal_calendar_subscription"."version" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_subscription_safe_create_time_utc" CHECK ("personal_calendar_subscription"."create_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_calendar_subscription_safe_update_time_utc" CHECK ("personal_calendar_subscription"."update_time_utc" BETWEEN -9007199254740991 AND 9007199254740991)
);

CREATE UNIQUE INDEX "personal_calendar_subscription_token_unique" ON "personal_calendar_subscription" USING btree ("token_hash");
