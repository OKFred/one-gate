import type { HistoryPoint, Metric, UsageDays } from './usage-types';

const DAY_MS = 86_400_000;
const OBSERVATION_SOURCE = 'quota-observation:';

export interface TrendPoint {
  dayUtc: number;
  value: number | null;
}

export type NumericTrendPoint = TrendPoint & { value: number };

export interface UsageTrendData {
  mode: 'daily' | 'cumulative' | 'capacity';
  points: TrendPoint[];
  segments: { start: NumericTrendPoint; end: NumericTrendPoint }[];
  rangeStartUtc: number;
  rangeEndUtc: number;
  quota: number | null;
  quotaUnavailableReason: 'unknown' | 'period' | 'stale' | null;
  minimum: number;
  maximum: number;
  buildingHistory: boolean;
  monthReference: boolean;
  stale: boolean;
}

const finite = (value: number | null): value is number => value !== null && Number.isFinite(value);
const dayStart = (value: number) => Math.floor(value / DAY_MS) * DAY_MS;

/** Choose one truthful series; a range total is never a billing-cycle total. */
export function buildUsageTrend(
  metric: Metric,
  history: readonly HistoryPoint[],
  days: UsageDays,
  now: number,
): UsageTrendData {
  const today = dayStart(now);
  const rangeStartUtc = today - (days - 1) * DAY_MS;
  const rangeEndUtc = today;
  const mode =
    metric.periodKind === 'day'
      ? 'daily'
      : metric.periodKind === 'instant'
        ? 'capacity'
        : 'cumulative';
  const periodDefined =
    finite(metric.periodStartUtc) &&
    finite(metric.periodEndUtc) &&
    metric.periodStartUtc < metric.periodEndUtc;
  const currentPeriod =
    periodDefined &&
    metric.periodStartUtc !== null &&
    metric.periodEndUtc !== null &&
    metric.periodStartUtc <= now &&
    now < metric.periodEndUtc &&
    metric.collectedTimeUtc >= metric.periodStartUtc &&
    metric.collectedTimeUtc < metric.periodEndUtc;
  const stale = metric.status === 'stale';
  const monthReference = metric.reason?.split(';').includes('calendar_month_reference') ?? false;
  const knownQuota =
    finite(metric.limit) &&
    metric.limit > 0 &&
    metric.quotaKind !== 'unknown' &&
    !['unknown', 'reference'].includes(metric.quality);
  const reliablePeriod =
    mode === 'capacity'
      ? metric.quotaKind === 'capacity' && metric.collectedTimeUtc <= now
      : currentPeriod;
  const quota =
    knownQuota && reliablePeriod && !stale && !monthReference && metric.collectedTimeUtc <= now
      ? metric.limit
      : null;
  const quotaUnavailableReason =
    quota !== null ? null : stale ? 'stale' : !knownQuota ? 'unknown' : 'period';
  const byDay = new Map<number, number | null>();

  for (const point of history) {
    if (point.metricId !== metric.id || !Number.isFinite(point.dayUtc)) continue;
    if (monthReference) continue;
    if (mode === 'capacity') continue;
    if (mode === 'daily' && point.kind !== 'daily_usage') continue;
    if (
      mode === 'cumulative' &&
      (point.kind !== 'cumulative_snapshot' || !point.source.startsWith(OBSERVATION_SOURCE))
    )
      continue;
    const day = dayStart(point.dayUtc);
    if (day < rangeStartUtc || day > rangeEndUtc) continue;
    if (
      mode === 'cumulative' &&
      (!periodDefined ||
        metric.periodStartUtc === null ||
        metric.periodEndUtc === null ||
        day < dayStart(metric.periodStartUtc) ||
        day >= metric.periodEndUtc)
    )
      continue;
    const value = finite(point.value) ? point.value : null;
    // Conflicting observations have no reliable daily value; never silently add them.
    byDay.set(day, byDay.has(day) && byDay.get(day) !== value ? null : value);
  }

  if (mode !== 'daily' && Number.isFinite(metric.collectedTimeUtc)) {
    const day = dayStart(metric.collectedTimeUtc);
    if (day >= rangeStartUtc && day <= rangeEndUtc && metric.collectedTimeUtc <= now)
      byDay.set(day, finite(metric.used) ? metric.used : null);
  }

  const points = [...byDay].map(([dayUtc, value]) => ({ dayUtc, value }));
  points.sort((left, right) => left.dayUtc - right.dayUtc);
  const segments: UsageTrendData['segments'] = [];
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    if (finite(start.value) && finite(end.value) && end.dayUtc - start.dayUtc === DAY_MS)
      segments.push({ start: { ...start, value: start.value }, end: { ...end, value: end.value } });
  }
  const values = points.flatMap((point) => (finite(point.value) ? [point.value] : []));
  const minimum = Math.min(0, ...values);
  const highest = Math.max(0, ...values, quota ?? 0);
  const maximum = highest > 0 ? Math.min(Number.MAX_VALUE, highest * 1.12) : minimum < 0 ? 0 : 1;
  return {
    mode,
    points,
    segments,
    rangeStartUtc,
    rangeEndUtc,
    quota,
    quotaUnavailableReason,
    minimum,
    maximum,
    buildingHistory: mode === 'cumulative' && !monthReference && values.length < 2,
    monthReference,
    stale,
  };
}
