import { useId } from 'react';
import { Box, Chip, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from '@/hooks/useTranslation';
import type { HistoryPoint, Metric, UsageDays } from './usage-types';
import { buildUsageTrend, type NumericTrendPoint } from './usage-trend';

dayjs.extend(utc);

const formatNumber = (value: number) =>
  new Intl.NumberFormat(
    undefined,
    value !== 0 && Math.abs(value) < 0.0001
      ? { notation: 'scientific', maximumSignificantDigits: 4 }
      : { maximumFractionDigits: 4 },
  ).format(value);
const formatAxis = (value: number) =>
  new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumSignificantDigits: 3,
  }).format(value);

export default function UsageTrend({
  metric,
  history,
  days,
}: {
  metric: Metric;
  history: HistoryPoint[];
  days: UsageDays;
}) {
  const t = useTranslation();
  const theme = useTheme();
  const descriptionId = useId();
  const trend = buildUsageTrend(metric, history, days, Date.now());
  const points = trend.points.filter((point): point is NumericTrendPoint => point.value !== null);
  const title = `${t(`home.usage.chart.${trend.mode}`)} (${metric.unit})`;
  const left = 80;
  const right = 674;
  const top = 20;
  const bottom = 220;
  const x = (day: number) =>
    trend.rangeStartUtc === trend.rangeEndUtc
      ? (left + right) / 2
      : left +
        ((day - trend.rangeStartUtc) / (trend.rangeEndUtc - trend.rangeStartUtc)) * (right - left);
  const magnitude = Math.max(Math.abs(trend.minimum), Math.abs(trend.maximum), Number.MIN_VALUE);
  const y = (value: number) =>
    bottom -
    ((value / magnitude - trend.minimum / magnitude) /
      (trend.maximum / magnitude - trend.minimum / magnitude)) *
      (bottom - top);
  const limitColor =
    metric.quotaKind === 'hard' ? theme.palette.error.main : theme.palette.secondary.main;
  const quotaLabel =
    trend.mode === 'daily'
      ? `${t('home.usage.chart.currentDaily')} · ${t(`home.usage.quota.${metric.quotaKind}`)}`
      : t(`home.usage.quota.${metric.quotaKind}`);
  const unavailableKey =
    trend.quotaUnavailableReason === 'period'
      ? 'home.usage.chart.periodUnknown'
      : trend.quotaUnavailableReason === 'stale'
        ? 'home.usage.chart.stale'
        : 'home.usage.chart.unknownLimit';

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap' }}
        >
          <Typography variant="subtitle2">{title}</Typography>
          {trend.mode === 'cumulative' && (
            <Chip
              size="small"
              variant="outlined"
              label={t(
                trend.monthReference
                  ? 'home.usage.period.calendar_month'
                  : `home.usage.period.${metric.periodKind}`,
              )}
            />
          )}
        </Stack>
        <Tooltip title={t('home.usage.chart.utcRange')}>
          <Typography variant="caption" color="text.secondary" tabIndex={0}>
            UTC
          </Typography>
        </Tooltip>
      </Stack>
      {points.length ? (
        <Box
          component="svg"
          viewBox="0 0 700 258"
          role="img"
          data-testid="usage-trend"
          aria-label={title}
          aria-describedby={descriptionId}
          sx={{
            display: 'block',
            width: '100%',
            maxHeight: 310,
            overflow: 'visible',
            '& text': { fontSize: { xs: 26, sm: 13 } },
            '& circle': { r: { xs: 7, sm: 4 } },
            '& circle:focus-visible': {
              outline: 'none',
              stroke: 'text.primary',
              strokeWidth: 3,
            },
          }}
        >
          <desc id={descriptionId}>
            {t('home.usage.chart.utcRange')}{' '}
            {trend.mode === 'daily' && trend.quota !== null
              ? t('home.usage.chart.dayReference')
              : trend.mode === 'capacity'
                ? t('home.usage.chart.currentOnly')
                : trend.monthReference
                  ? t('home.usage.chart.monthReference')
                  : trend.buildingHistory
                    ? t('home.usage.chart.cumulativeFirst')
                    : ''}
          </desc>
          {[trend.minimum, (trend.maximum + trend.minimum) / 2, trend.maximum].map((value) => (
            <g key={value}>
              <line
                x1={left}
                y1={y(value)}
                x2={right}
                y2={y(value)}
                stroke={theme.palette.divider}
              />
              <text
                x={left - 8}
                y={y(value) + 4}
                textAnchor="end"
                fill={theme.palette.text.secondary}
              >
                {formatAxis(value)}
              </text>
            </g>
          ))}
          {trend.quota !== null && (
            <>
              <line
                data-testid="usage-threshold-warning"
                data-value={trend.quota * 0.8}
                x1={left}
                y1={y(trend.quota * 0.8)}
                x2={right}
                y2={y(trend.quota * 0.8)}
                stroke={theme.palette.warning.main}
                strokeWidth={1.5}
                strokeDasharray="5 5"
              />
              <line
                data-testid="usage-threshold-limit"
                data-value={trend.quota}
                x1={left}
                y1={y(trend.quota)}
                x2={right}
                y2={y(trend.quota)}
                stroke={limitColor}
                strokeWidth={1.5}
                strokeDasharray="8 4"
              />
            </>
          )}
          {trend.segments.map(({ start, end }) => (
            <line
              key={`${start.dayUtc}-${end.dayUtc}`}
              data-testid="usage-trend-segment"
              data-start-day-utc={start.dayUtc}
              data-end-day-utc={end.dayUtc}
              x1={x(start.dayUtc)}
              y1={y(start.value)}
              x2={x(end.dayUtc)}
              y2={y(end.value)}
              stroke={theme.palette.primary.main}
              strokeWidth={2.5}
            />
          ))}
          {points.map((point) => {
            const label = `${dayjs.utc(point.dayUtc).format('YYYY-MM-DD')}: ${formatNumber(point.value)} ${metric.unit}`;
            return (
              <Tooltip title={label} key={point.dayUtc}>
                <circle
                  data-testid="usage-trend-point"
                  data-day-utc={point.dayUtc}
                  data-value={point.value}
                  cx={x(point.dayUtc)}
                  cy={y(point.value)}
                  r={4}
                  fill={theme.palette.primary.main}
                  tabIndex={0}
                  role="img"
                  aria-label={label}
                />
              </Tooltip>
            );
          })}
          {trend.rangeStartUtc === trend.rangeEndUtc ? (
            <text
              x={(left + right) / 2}
              y={246}
              textAnchor="middle"
              fill={theme.palette.text.secondary}
            >
              {dayjs.utc(trend.rangeStartUtc).format('MM-DD')}
            </text>
          ) : (
            <>
              <text x={left} y={246} fill={theme.palette.text.secondary}>
                {dayjs.utc(trend.rangeStartUtc).format('MM-DD')}
              </text>
              <text x={right} y={246} textAnchor="end" fill={theme.palette.text.secondary}>
                {dayjs.utc(trend.rangeEndUtc).format('MM-DD')}
              </text>
            </>
          )}
        </Box>
      ) : (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('home.usage.noHistory')}</Typography>
        </Box>
      )}
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{ width: 20, borderTop: 2, borderColor: 'primary.main' }} />
          <Typography variant="caption">{t('home.usage.chart.observed')}</Typography>
        </Stack>
        {trend.quota !== null ? (
          <>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 20, borderTop: '2px dashed', borderColor: 'warning.main' }} />
              <Typography variant="caption">{t('home.usage.chart.warning')}</Typography>
            </Stack>
            <Tooltip
              title={trend.mode === 'daily' ? t('home.usage.chart.dayReference') : quotaLabel}
            >
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }} tabIndex={0}>
                <Box sx={{ width: 20, borderTop: '2px dashed', borderColor: limitColor }} />
                <Typography variant="caption">
                  {quotaLabel} · {formatNumber(trend.quota)} {metric.unit} (100%)
                </Typography>
              </Stack>
            </Tooltip>
          </>
        ) : (
          <Typography variant="caption" color={trend.stale ? 'warning.main' : 'text.secondary'}>
            {t(
              trend.monthReference && !trend.stale
                ? 'home.usage.chart.monthReference'
                : unavailableKey,
            )}
          </Typography>
        )}
      </Stack>
      {trend.buildingHistory && (
        <Typography variant="caption" color="text.secondary">
          {t('home.usage.chart.cumulativeFirst')}
        </Typography>
      )}
      {trend.mode === 'capacity' && (
        <Typography variant="caption" color="text.secondary">
          {t('home.usage.chart.currentOnly')}
        </Typography>
      )}
      {trend.monthReference && trend.stale && (
        <Typography variant="caption" color="text.secondary">
          {t('home.usage.chart.monthReference')}
        </Typography>
      )}
    </Stack>
  );
}
