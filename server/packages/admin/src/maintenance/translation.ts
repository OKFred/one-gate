import type { TranslationInputItem } from "@hodor/core/db/initTranslation";
import type { BusinessKey } from "@hodor/core/types/business";

export const maintenanceTranslations = {
  "maintenance.cron": [
    {
      application: "backend",
      tKey: "cron.frequency.custom",
      langCodes: {
        "zh-CN": "自定义周期",
        "en-US": "Custom cycle",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.minutely",
      langCodes: {
        "zh-CN": "每分钟执行一次",
        "en-US": "Execute every minute",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.minutes",
      langCodes: {
        "zh-CN": "每 {minutes} 分钟执行一次",
        "en-US": "Execute every {minutes} minutes",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.hourly",
      langCodes: {
        "zh-CN": "每小时执行一次",
        "en-US": "Execute every hour",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.hours",
      langCodes: {
        "zh-CN": "每 {hours} 小时执行一次",
        "en-US": "Execute every {hours} hours",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.daily",
      langCodes: {
        "zh-CN": "每天执行一次",
        "en-US": "Execute every day",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.days",
      langCodes: {
        "zh-CN": "每 {days} 天执行一次",
        "en-US": "Execute every {days} days",
      },
    },
    {
      application: "backend",
      tKey: "cron.frequency.seconds",
      langCodes: {
        "zh-CN": "每 {seconds} 秒执行一次",
        "en-US": "Execute every {seconds} seconds",
      },
    },
  ],
  "maintenance.api_docs": [
    {
      application: "backend",
      tKey: "errorHandler.apiDocs.invalidFormat",
      langCodes: {
        "zh-CN": "API 文档内容格式无效",
        "en-US": "Invalid API document format",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.apiDocs.parseFailed",
      langCodes: {
        "zh-CN": "解析 API 文档内容失败",
        "en-US": "Failed to parse API document content",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.apiDocs.parseFailedGeneral",
      langCodes: {
        "zh-CN": "API 文档解析异常",
        "en-US": "API document parsing exception",
      },
    },
    {
      application: "backend",
      tKey: "errorHandler.apiDocs.unsupportedFormat",
      langCodes: {
        "zh-CN": "不支持的文档格式",
        "en-US": "Unsupported API document format",
      },
    },
  ],
  maintenance: [],
  "maintenance.cache": [],
  "maintenance.login_log": [],
  "maintenance.init": [],
  "maintenance.api_task": [],
} satisfies Record<
  Extract<
    BusinessKey,
    | "maintenance.cron"
    | "maintenance.api_docs"
    | "maintenance"
    | "maintenance.cache"
    | "maintenance.login_log"
    | "maintenance.init"
    | "maintenance.api_task"
  >,
  TranslationInputItem[]
>;
