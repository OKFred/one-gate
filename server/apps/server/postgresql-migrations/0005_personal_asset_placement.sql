CREATE TABLE "personal_asset_placement" (
	"owner_user_id" bigint NOT NULL,
	"tenant_id" bigint NOT NULL,
	"asset_id" text NOT NULL,
	"site" text,
	"floor" bigint,
	"version" bigint NOT NULL,
	"create_time_utc" bigint NOT NULL,
	"update_time_utc" bigint NOT NULL,
	CONSTRAINT "personal_asset_placement_owner_user_id_tenant_id_asset_id_pk" PRIMARY KEY("owner_user_id","tenant_id","asset_id"),
	CONSTRAINT "personal_asset_placement_version_check" CHECK ("personal_asset_placement"."version" >= 1),
	CONSTRAINT "personal_asset_placement_location_check" CHECK (("personal_asset_placement"."site" IS NULL AND "personal_asset_placement"."floor" IS NULL) OR ("personal_asset_placement"."site" IS NOT NULL AND "personal_asset_placement"."floor" IS NOT NULL AND (("personal_asset_placement"."site" = 'OpenLife' AND "personal_asset_placement"."floor" = 1) OR ("personal_asset_placement"."site" = 'OpenMind' AND "personal_asset_placement"."floor" BETWEEN 1 AND 4)))),
	CONSTRAINT "personal_asset_placement_safe_owner_user_id" CHECK ("personal_asset_placement"."owner_user_id" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_asset_placement_safe_tenant_id" CHECK ("personal_asset_placement"."tenant_id" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_asset_placement_safe_floor" CHECK ("personal_asset_placement"."floor" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_asset_placement_safe_version" CHECK ("personal_asset_placement"."version" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_asset_placement_safe_create_time_utc" CHECK ("personal_asset_placement"."create_time_utc" BETWEEN -9007199254740991 AND 9007199254740991),
	CONSTRAINT "personal_asset_placement_safe_update_time_utc" CHECK ("personal_asset_placement"."update_time_utc" BETWEEN -9007199254740991 AND 9007199254740991)
);
