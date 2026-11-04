-- Read-only mobile task runtime contract, generated from its targeted Drizzle schema.

SELECT json(CASE WHEN EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='admin_mobile_task_runtime' AND sql='CREATE TABLE `admin_mobile_task_runtime` (
	`client_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`session_started_at` integer NOT NULL,
	`revision` integer NOT NULL,
	`device_time_utc` integer NOT NULL,
	`received_time_utc` integer NOT NULL,
	`snapshot_json` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `admin_mobile_device`(`client_id`) ON UPDATE no action ON DELETE cascade
)')
  AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE tbl_name='admin_mobile_task_runtime' AND type IN ('index','trigger') AND sql IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM pragma_foreign_key_check('admin_mobile_task_runtime'))
  THEN '{}' ELSE 'invalid mobile task runtime schema' END) AS mobile_task_runtime_contract;
