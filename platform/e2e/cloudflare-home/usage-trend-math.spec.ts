import assert from 'node:assert/strict';
import { test } from '@playwright/test';
import { buildUsageTrend } from '../../apps/admin/src/pages/home/usage-trend';
import type { HistoryPoint, Metric } from '../../apps/admin/src/pages/home/usage-types';

const DAY = 86_400_000;
const today = Date.UTC(2026, 9, 25);
const now = today + 8 * 3_600_000;
const metric: Metric = {
  id: 'synthetic',
  name: 'Synthetic quota',
  product: 'Synthetic',
  used: 80,
  unit: 'requests',
  limit: 100,
  remaining: 20,
  percentage: 80,
  periodKind: 'day',
  periodStartUtc: today,
  periodEndUtc: today + DAY,
  resetTimeUtc: today + DAY,
  quotaKind: 'hard',
  quality: 'exact',
  status: 'available',
  source: 'synthetic-official',
  reason: null,
  collectedTimeUtc: now,
};
const daily = (offset: number, value: number | null): HistoryPoint => ({
  metricId: metric.id,
  dayUtc: today + offset * DAY,
  kind: 'daily_usage',
  source: 'synthetic-official',
  value,
});
const observed = (offset: number, value: number | null): HistoryPoint => ({
  ...daily(offset, value),
  kind: 'cumulative_snapshot',
  source: 'quota-observation:synthetic-official',
});
const monthly: Metric = {
  ...metric,
  periodKind: 'billing_cycle',
  quotaKind: 'included',
  periodStartUtc: Date.UTC(2026, 9, 8),
  periodEndUtc: Date.UTC(2026, 10, 8),
};

test('daily series keeps nulls and date gaps without invented zero values', () => {
  const result = buildUsageTrend(
    metric,
    [daily(-6, 25), daily(-5, 30), daily(-4, null), daily(-3, 45), daily(-1, 60), daily(0, 120)],
    7,
    now,
  );
  assert.deepEqual(
    result.points.map((point) => point.value),
    [25, 30, null, 45, 60, 120],
  );
  assert.equal(result.segments.length, 2);
  assert.equal(result.quota, 100);
  assert.ok(result.maximum >= 120);
});

test('one and three days mean UTC calendar days including the unfinished current day', () => {
  const history = [daily(-3, 1), daily(-2, 2), daily(-1, 3), daily(0, 4), daily(1, 5)];
  assert.deepEqual(
    buildUsageTrend(metric, history, 1, now).points.map((p) => p.value),
    [4],
  );
  const three = buildUsageTrend(metric, history, 3, now);
  assert.deepEqual(
    three.points.map((point) => point.value),
    [2, 3, 4],
  );
  assert.equal(three.segments.length, 2);
  assert.equal(three.rangeStartUtc, today - 2 * DAY);
});

test('billing series uses observation totals rather than daily sums or charge-period snapshots', () => {
  const result = buildUsageTrend(
    monthly,
    [
      observed(-2, 40),
      daily(-1, 999),
      { ...observed(-1, 999), source: 'billing-v1' },
      observed(-1, 60),
      observed(0, 80),
    ],
    3,
    now,
  );
  assert.equal(result.mode, 'cumulative');
  assert.deepEqual(
    result.points.map((point) => point.value),
    [40, 60, 80],
  );
  assert.equal(result.buildingHistory, false);
  assert.equal(result.quota, 100);
});

test('a billing metric with no trustworthy observations falls back to the current total only', () => {
  const result = buildUsageTrend(
    monthly,
    [daily(-1, 20), daily(0, 30), { ...observed(-1, 999), source: 'billing-v1' }],
    3,
    now,
  );
  assert.deepEqual(result.points, [{ dayUtc: today, value: 80 }]);
  assert.equal(result.buildingHistory, true);
});

test('only the metric current cycle contributes cumulative observations', () => {
  const result = buildUsageTrend(
    { ...monthly, periodStartUtc: today - DAY },
    [observed(-3, 500), observed(-1, 60), observed(0, 80)],
    7,
    now,
  );
  assert.deepEqual(
    result.points.map((point) => point.value),
    [60, 80],
  );
});

test('unknown or reference quotas never draw a limit', () => {
  for (const patched of [
    { ...metric, quotaKind: 'unknown' as const },
    { ...metric, quality: 'reference' as const },
    { ...metric, quality: 'unknown' as const },
    { ...metric, limit: 0 },
    { ...metric, limit: Number.POSITIVE_INFINITY },
  ])
    assert.equal(buildUsageTrend(patched, [daily(0, 80)], 1, now).quota, null);
});

test('stale data or an unverified current period does not masquerade as a current quota', () => {
  const stale = buildUsageTrend({ ...metric, status: 'stale' }, [daily(0, 80)], 1, now);
  assert.equal(stale.stale, true);
  assert.equal(stale.quota, null);
  assert.equal(stale.quotaUnavailableReason, 'stale');
  const expired = buildUsageTrend({ ...monthly, periodEndUtc: today }, [], 3, now);
  assert.equal(expired.quota, null);
  assert.equal(expired.quotaUnavailableReason, 'period');
});

test('current capacity accepts a capacity limit without a calendar period and never accumulates', () => {
  const result = buildUsageTrend(
    {
      ...metric,
      used: 6,
      limit: 10,
      quotaKind: 'capacity',
      unit: 'GB',
      periodKind: 'instant',
      periodStartUtc: null,
      periodEndUtc: null,
    },
    [daily(-1, 900), observed(0, 800)],
    3,
    now,
  );
  assert.equal(result.mode, 'capacity');
  assert.deepEqual(result.points, [{ dayUtc: today, value: 6 }]);
  assert.equal(result.quota, 10);
  assert.equal(result.buildingHistory, false);
});

test('conflicting same-day history is unknown rather than silently added or selected', () => {
  const result = buildUsageTrend(metric, [daily(0, 10), daily(0, 20)], 1, now);
  assert.deepEqual(result.points, [{ dayUtc: today, value: null }]);
  assert.equal(result.segments.length, 0);
});

test('a null current cumulative total stays unknown instead of preserving an older same-day total', () => {
  const result = buildUsageTrend({ ...monthly, used: null }, [observed(0, 80)], 1, now);
  assert.deepEqual(result.points, [{ dayUtc: today, value: null }]);
});

test('small observed units retain a useful range and finite large quotas do not overflow it', () => {
  const small = buildUsageTrend({ ...monthly, used: 0.0016, limit: null }, [], 1, now);
  assert.ok(small.maximum > 0.0016 && small.maximum < 0.01);
  const large = buildUsageTrend({ ...metric, limit: Number.MAX_VALUE }, [daily(0, 10)], 1, now);
  assert.ok(Number.isFinite(large.maximum));
});

test('a future collection timestamp cannot establish a current daily or billing quota', () => {
  for (const current of [metric, monthly]) {
    const result = buildUsageTrend(
      { ...current, collectedTimeUtc: now + 3_600_000 },
      [daily(0, 80)],
      1,
      now,
    );
    assert.equal(result.quota, null);
  }
});

test('an unverified calendar-month reference is current-only and does not promise building history', () => {
  const result = buildUsageTrend(
    {
      ...monthly,
      periodKind: 'calendar_month',
      reason: 'calendar_month_reference;billing_cycle_unavailable',
    },
    [observed(-2, 40), observed(-1, 60), observed(0, 80), daily(0, 999)],
    3,
    now,
  );
  assert.deepEqual(result.points, [{ dayUtc: today, value: 80 }]);
  assert.equal(result.monthReference, true);
  assert.equal(result.buildingHistory, false);
  assert.equal(result.quota, null);
});
