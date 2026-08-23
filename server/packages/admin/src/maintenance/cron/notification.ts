export interface CronNotificationConfig {
  webhookSource: string;
  formatter?: "treasury_30y_yield";
  title?: string;
}

export interface ParsedCronParameters {
  request: Record<string, unknown>;
  notification?: CronNotificationConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseCronParameters(
  parameters?: string | null
): ParsedCronParameters {
  if (!parameters) return { request: {} };
  const value: unknown = JSON.parse(parameters);
  if (!isRecord(value)) throw new Error("Cron parameters 必须是 JSON 对象");

  const rawNotification = value.notification;
  let notification: CronNotificationConfig | undefined;
  if (rawNotification !== undefined) {
    if (
      !isRecord(rawNotification) ||
      typeof rawNotification.webhookSource !== "string"
    ) {
      throw new Error("Cron notification.webhookSource 必须是字符串");
    }
    const rawFormatter = rawNotification.formatter;
    if (rawFormatter !== undefined && rawFormatter !== "treasury_30y_yield") {
      throw new Error(`不支持的通知格式化器: ${String(rawFormatter)}`);
    }
    const formatter =
      rawFormatter === "treasury_30y_yield" ? rawFormatter : undefined;
    notification = {
      webhookSource: rawNotification.webhookSource,
      formatter,
      title:
        typeof rawNotification.title === "string"
          ? rawNotification.title
          : undefined,
    };
  }

  if (value.request !== undefined) {
    if (!isRecord(value.request))
      throw new Error("Cron request 必须是 JSON 对象");
    return { request: value.request, notification };
  }

  const request = { ...value };
  delete request.notification;
  return { request, notification };
}

function extractTag(block: string, tagName: string): string | null {
  const expression = new RegExp(
    `<(?:[A-Za-z0-9_-]+:)?${tagName}(?:\\s[^>]*)?>([^<]*)<\\/(?:[A-Za-z0-9_-]+:)?${tagName}>`,
    "i"
  );
  return block.match(expression)?.[1]?.trim() ?? null;
}

function normalizeTreasuryDate(value: string): string | null {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const usMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (usMatch) return `${usMatch[3]}-${usMatch[1]}-${usMatch[2]}`;
  return null;
}

export function extractLatestTreasury30YearYield(xml: string): {
  date: string;
  yieldPercent: string;
} {
  const legacyBlocks = xml.match(/<G_NEW_DATE>[\s\S]*?<\/G_NEW_DATE>/gi) ?? [];
  const atomBlocks =
    xml.match(
      /<(?:[A-Za-z0-9_-]+:)?entry(?:\s[^>]*)?>[\s\S]*?<\/(?:[A-Za-z0-9_-]+:)?entry>/gi
    ) ?? [];
  const candidates = [...legacyBlocks, ...atomBlocks]
    .map((block) => {
      const rawDate =
        extractTag(block, "NEW_DATE") ?? extractTag(block, "BID_CURVE_DATE");
      const yieldPercent = extractTag(block, "BC_30YEAR");
      const date = rawDate ? normalizeTreasuryDate(rawDate) : null;
      return date && yieldPercent ? { date, yieldPercent } : null;
    })
    .filter(
      (item): item is { date: string; yieldPercent: string } => item !== null
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const latest = candidates[0];
  if (!latest) throw new Error("财政部响应中未找到 30 年期收益率");
  return latest;
}

export function formatCronNotification(
  jobName: string,
  responseBody: string,
  config: CronNotificationConfig
): string {
  const title = config.title?.trim() || jobName;
  if (config.formatter === "treasury_30y_yield") {
    const latest = extractLatestTreasury30YearYield(responseBody);
    return `【${title}】\n日期：${latest.date}\n收益率：${latest.yieldPercent}%\n数据源：U.S. Department of the Treasury`;
  }
  return `【${title}】\n${responseBody.slice(0, 4_000)}`;
}
