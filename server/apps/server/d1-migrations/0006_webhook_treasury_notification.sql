CREATE TABLE IF NOT EXISTS `base_webhook_config` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `source` text NOT NULL,
  `url` text NOT NULL,
  `is_enabled` integer NOT NULL,
  `is_primary` integer NOT NULL,
  `remark` text,
  `creator_id` integer NOT NULL,
  `updater_id` integer,
  `create_time_utc` integer DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000 + CAST(substr(strftime('%f', 'now'), 4, 3) AS INTEGER)) NOT NULL,
  `update_time_utc` integer
);

CREATE INDEX IF NOT EXISTS `idx_base_webhook_config_source`
  ON `base_webhook_config` (`source`);

INSERT INTO `maintenance_api_task` (
  `task_key`, `name`, `description`, `base_url`, `path`, `method`,
  `headers`, `timeout_ms`, `is_enabled`, `creator_id`
)
SELECT
  'us_treasury_30y_yield',
  '30年期美债收益率',
  '采集美国财政部每日国债收益率 XML，并提取 30 年期收益率',
  'https://home.treasury.gov',
  '/sites/default/files/interest-rates/yield.xml',
  'GET',
  '{"Accept":"application/xml"}',
  30000,
  1,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM `maintenance_api_task`
  WHERE `task_key` = 'us_treasury_30y_yield'
);

INSERT INTO `system_cron_job` (
  `job_key`, `name`, `cron_expression`, `status`, `parameters`,
  `run_count`, `creator_id`
)
SELECT
  'us_treasury_30y_yield',
  '每日跟踪30年期美债收益率',
  '0 1 * * *',
  1,
  '{"request":{},"notification":{"webhookSource":"feishu","formatter":"treasury_30y_yield","title":"30年期美债收益率"}}',
  0,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM `system_cron_job`
  WHERE `job_key` = 'us_treasury_30y_yield'
);
