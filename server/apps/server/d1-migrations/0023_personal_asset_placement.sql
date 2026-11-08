CREATE TABLE IF NOT EXISTS `personal_asset_placement` (
	`owner_user_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`asset_id` text NOT NULL,
	`site` text,
	`floor` integer,
	`version` integer NOT NULL,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	PRIMARY KEY(`owner_user_id`, `tenant_id`, `asset_id`),
	CONSTRAINT "personal_asset_placement_version_check" CHECK("personal_asset_placement"."version" >= 1),
	CONSTRAINT "personal_asset_placement_location_check" CHECK(("personal_asset_placement"."site" IS NULL AND "personal_asset_placement"."floor" IS NULL) OR ("personal_asset_placement"."site" IS NOT NULL AND "personal_asset_placement"."floor" IS NOT NULL AND (("personal_asset_placement"."site" = 'OpenLife' AND "personal_asset_placement"."floor" = 1) OR ("personal_asset_placement"."site" = 'OpenMind' AND "personal_asset_placement"."floor" BETWEEN 1 AND 4))))
);

-- Read-only personal asset placement schema contract, generated from its targeted Drizzle schema.

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='personal_asset_placement' AND sql='CREATE TABLE `personal_asset_placement` (
	`owner_user_id` integer NOT NULL,
	`tenant_id` integer NOT NULL,
	`asset_id` text NOT NULL,
	`site` text,
	`floor` integer,
	`version` integer NOT NULL,
	`create_time_utc` integer NOT NULL,
	`update_time_utc` integer NOT NULL,
	PRIMARY KEY(`owner_user_id`, `tenant_id`, `asset_id`),
	CONSTRAINT "personal_asset_placement_version_check" CHECK("personal_asset_placement"."version" >= 1),
	CONSTRAINT "personal_asset_placement_location_check" CHECK(("personal_asset_placement"."site" IS NULL AND "personal_asset_placement"."floor" IS NULL) OR ("personal_asset_placement"."site" IS NOT NULL AND "personal_asset_placement"."floor" IS NOT NULL AND (("personal_asset_placement"."site" = ''OpenLife'' AND "personal_asset_placement"."floor" = 1) OR ("personal_asset_placement"."site" = ''OpenMind'' AND "personal_asset_placement"."floor" BETWEEN 1 AND 4))))
)')
  AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE tbl_name='personal_asset_placement' AND type='trigger')
  AND (SELECT count(*) FROM sqlite_master WHERE tbl_name='personal_asset_placement' AND type='index' AND sql IS NOT NULL)=0 THEN '{}' ELSE 'invalid personal_asset_placement schema' END) AS personal_asset_placement_contract;
