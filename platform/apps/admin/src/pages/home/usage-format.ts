import dayjs from 'dayjs';
import type { Cost, Metric } from './usage-types';

type Translator = (key: string, params?: Record<string, string | number>) => string;

export const numberText = (value: number | null, unknown: string) =>
  value === null || !Number.isFinite(value)
    ? unknown
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);

export const dateText = (value: number | null, unknown: string) =>
  value === null ? unknown : dayjs(value).format('YYYY-MM-DD HH:mm');

export const shortPeriod = (start: number | null, end: number | null, unknown: string) =>
  start === null || end === null
    ? unknown
    : `${dayjs(start).format('MM/DD')} — ${dayjs(end).format('MM/DD')}`;

export function hasQuota(metric: Metric): boolean {
  const now = Date.now();
  const currentPeriod =
    metric.periodKind === 'instant'
      ? metric.quotaKind === 'capacity'
      : metric.periodStartUtc !== null &&
        metric.periodEndUtc !== null &&
        metric.periodStartUtc <= now &&
        now < metric.periodEndUtc &&
        metric.periodStartUtc <= metric.collectedTimeUtc &&
        metric.collectedTimeUtc < metric.periodEndUtc;
  return (
    currentPeriod &&
    metric.status !== 'stale' &&
    metric.collectedTimeUtc <= now &&
    metric.limit !== null &&
    Number.isFinite(metric.limit) &&
    metric.limit > 0 &&
    metric.quotaKind !== 'unknown' &&
    !metric.reason?.split(';').includes('calendar_month_reference') &&
    !['unknown', 'reference'].includes(metric.quality)
  );
}

export function quotaColor(metric: Metric): 'error' | 'warning' | 'primary' {
  if (
    !hasQuota(metric) ||
    metric.used === null ||
    !Number.isFinite(metric.used) ||
    metric.percentage === null ||
    !Number.isFinite(metric.percentage)
  )
    return 'primary';
  if (metric.percentage >= 100) return metric.quotaKind === 'hard' ? 'error' : 'warning';
  return metric.percentage >= 80 ? 'warning' : 'primary';
}

export function warningKey(metric: Metric): string | null {
  if (
    !hasQuota(metric) ||
    metric.used === null ||
    !Number.isFinite(metric.used) ||
    metric.percentage === null ||
    !Number.isFinite(metric.percentage)
  )
    return null;
  if (metric.percentage >= 100)
    return metric.quotaKind === 'hard'
      ? 'home.usage.hardReached'
      : metric.quotaKind === 'capacity'
        ? 'home.usage.capacityReached'
        : 'home.usage.includedExceeded';
  return metric.percentage >= 80 ? 'home.usage.highUsage' : null;
}

export function metricName(metric: Metric, t: Translator): string {
  const names: Record<string, string> = {
    'Workers requests (analytics)': 'requests',
    'Pages Functions requests (analytics)': 'requests',
    'D1 rows read': 'rowsRead',
    'D1 rows written': 'rowsWritten',
    'Durable Objects requests': 'requests',
    'KV read': 'reads',
    'KV write': 'writes',
  };
  const key = names[metric.name];
  if (key) return t(`home.usage.metricName.${key}`);
  if (metric.product === 'R2') {
    if (/^R2 Data Storage \(First 10GB-Month included\)$/i.test(metric.name))
      return t('home.usage.metricName.storage');
    if (/^R2 Storage Class A Operations \(First 1M included\)$/i.test(metric.name))
      return t('home.usage.metricName.classA');
    if (/^R2 Storage Class B Operations \(First 10M included\)$/i.test(metric.name))
      return t('home.usage.metricName.classB');
  }
  return metric.name;
}

export const costStatusKeys: Record<string, string> = {
  official_usage_cost_billed: 'home.usage.costBasis.billed',
  official_usage_cost_contracted: 'home.usage.costBasis.contracted',
  official_usage_cost_effective: 'home.usage.costBasis.effective',
  stale_official_usage_cost: 'home.usage.costBasis.stale',
};
const knownCostBases = new Set(
  Object.keys(costStatusKeys).filter((key) => key !== 'stale_official_usage_cost'),
);

export function groupCosts(costs: Cost[]): Cost[][] {
  const groups = new Map<string, Cost[]>();
  for (const cost of costs) {
    const key =
      knownCostBases.has(cost.status) && cost.periodStartUtc !== null && cost.periodEndUtc !== null
        ? JSON.stringify([cost.currency, cost.periodStartUtc, cost.periodEndUtc, cost.status])
        : JSON.stringify([cost.id]);
    groups.set(key, [...(groups.get(key) ?? []), cost]);
  }
  return [...groups.values()];
}

/** Keep monetary totals exact and never combine different cost bases. */
export function decimalTotal(costs: Cost[]): string | null {
  const amounts = costs.map((cost) => cost.amount);
  if (amounts.some((amount) => !/^-?\d+(?:\.\d+)?$/u.test(amount))) return null;
  const precision = Math.max(0, ...amounts.map((amount) => amount.split('.')[1]?.length ?? 0));
  const sum = amounts.reduce((total, amount) => {
    const [whole, fraction = ''] = amount.replace('-', '').split('.');
    const value = BigInt(whole + fraction.padEnd(precision, '0'));
    return total + (amount.startsWith('-') ? -value : value);
  }, 0n);
  const digits = (sum < 0n ? -sum : sum).toString().padStart(precision + 1, '0');
  return (
    (sum < 0n ? '-' : '') +
    (precision ? `${digits.slice(0, -precision)}.${digits.slice(-precision)}` : digits)
  );
}
