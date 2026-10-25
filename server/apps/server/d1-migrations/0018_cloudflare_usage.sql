CREATE TABLE IF NOT EXISTS `cloudflare_usage_daily` (
	`account_id` text NOT NULL,
	`metric_id` text NOT NULL,
	`day_utc` integer NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`value` text,
	PRIMARY KEY(`account_id`, `metric_id`, `day_utc`, `kind`)
);

CREATE INDEX IF NOT EXISTS `cloudflare_usage_daily_retention_idx` ON `cloudflare_usage_daily` (`account_id`,`day_utc`);

CREATE TABLE IF NOT EXISTS `cloudflare_usage_snapshot` (
	`account_id` text NOT NULL,
	`source` text NOT NULL,
	`payload_json` text NOT NULL,
	`collected_time_utc` integer NOT NULL,
	PRIMARY KEY(`account_id`, `source`)
);

CREATE TABLE IF NOT EXISTS `cloudflare_usage_sync` (
	`account_id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`state` text NOT NULL,
	`last_success_time_utc` integer,
	`next_run_time_utc` integer NOT NULL,
	`retry_time_utc` integer,
	`requested_time_utc` integer NOT NULL,
	`owner` text,
	`generation` integer NOT NULL,
	`lease_expires_time_utc` integer NOT NULL,
	`cursor_json` text,
	`attempts` integer NOT NULL,
	`coverage_json` text NOT NULL
);

-- Read-only Cloudflare usage schema contract, generated from the targeted Drizzle schema.

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='cloudflare_usage_daily' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), CHAR(96), ''))='createtablecloudflare_usage_daily(account_idtextnotnull,metric_idtextnotnull,day_utcintegernotnull,kindtextnotnull,sourcetextnotnull,valuetext,primarykey(account_id,metric_id,day_utc,kind))')
  AND EXISTS (SELECT 1 FROM sqlite_master WHERE type='index' AND name='cloudflare_usage_daily_retention_idx' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), CHAR(96), ''))='createindexcloudflare_usage_daily_retention_idxoncloudflare_usage_daily(account_id,day_utc)') THEN '{}' ELSE 'invalid cloudflare_usage_daily schema' END) AS cloudflare_usage_daily_contract;

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='cloudflare_usage_snapshot' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), CHAR(96), ''))='createtablecloudflare_usage_snapshot(account_idtextnotnull,sourcetextnotnull,payload_jsontextnotnull,collected_time_utcintegernotnull,primarykey(account_id,source))') THEN '{}' ELSE 'invalid cloudflare_usage_snapshot schema' END) AS cloudflare_usage_snapshot_contract;

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='cloudflare_usage_sync' AND LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(sql, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''), '"', ''), CHAR(96), ''))='createtablecloudflare_usage_sync(account_idtextprimarykeynotnull,job_idtext,statetextnotnull,last_success_time_utcinteger,next_run_time_utcintegernotnull,retry_time_utcinteger,requested_time_utcintegernotnull,ownertext,generationintegernotnull,lease_expires_time_utcintegernotnull,cursor_jsontext,attemptsintegernotnull,coverage_jsontextnotnull)') THEN '{}' ELSE 'invalid cloudflare_usage_sync schema' END) AS cloudflare_usage_sync_contract;
