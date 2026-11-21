import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { Metric, Overview } from './usage-types';
import {
  decimalTotal,
  groupCosts,
  hasQuota,
  metricName,
  numberText,
  quotaColor,
  shortPeriod,
  warningKey,
} from './usage-format';

function knownPercentage(metric: Metric): number | null {
  return hasQuota(metric) &&
    metric.used !== null &&
    Number.isFinite(metric.used) &&
    metric.percentage !== null &&
    Number.isFinite(metric.percentage)
    ? metric.percentage
    : null;
}

function attentionPriority(metric: Metric): number {
  const percentage = knownPercentage(metric);
  if (percentage === null) return -1;
  if (percentage >= 100 && ['hard', 'capacity'].includes(metric.quotaKind)) return 3;
  if (percentage >= 100) return 2;
  return percentage >= 80 ? 1 : 0;
}

export default function UsageSummary({
  data,
  onSelect,
}: {
  data: Overview;
  onSelect: (id: string) => void;
}) {
  const t = useTranslation();
  const unknown = t('home.usage.unknown');
  const attentionAll = data.metrics.filter((metric) => warningKey(metric) !== null);
  const attentionCount = attentionAll.length;
  const attentionMetrics = [...attentionAll]
    .sort(
      (left, right) =>
        attentionPriority(right) - attentionPriority(left) ||
        (knownPercentage(right) ?? -1) - (knownPercentage(left) ?? -1),
    )
    .slice(0, 3);
  const costGroups = groupCosts(data.costs);
  const singleCost = costGroups.length === 1 ? costGroups[0] : undefined;
  const amount = singleCost ? decimalTotal(singleCost) : null;
  const stale =
    data.metrics.some((metric) => metric.status === 'stale') ||
    data.costs.some((cost) => cost.status === 'stale_official_usage_cost');
  const partial =
    data.configuration === 'partial' ||
    data.sync.state === 'partial' ||
    data.coverage.some((item) => item.status !== 'available');
  const statusKey =
    data.configuration === 'missing'
      ? 'home.usage.summary.notConfigured'
      : data.sync.state === 'failed'
        ? 'home.usage.sync.failed'
        : stale
          ? 'home.usage.coverage.stale'
          : partial
            ? 'home.usage.summary.partial'
            : data.metrics.length === 0 ||
                data.metrics.some((metric) => knownPercentage(metric) === null)
              ? 'home.usage.summary.incomplete'
              : `home.usage.sync.${data.sync.state}`;
  const costText =
    singleCost && amount !== null
      ? `${singleCost[0].currency} ${amount}`
      : costGroups.length > 1
        ? t('home.usage.summary.costGroups', { count: costGroups.length })
        : t('home.usage.summary.unavailable');

  return (
    <Paper
      variant="outlined"
      data-testid="usage-summary"
      sx={{ px: { xs: 2, sm: 2.5 }, py: 1.5, minWidth: 0 }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}
        >
          <Typography component="h2" variant="subtitle2" sx={{ fontWeight: 600 }}>
            Cloudflare
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{ alignItems: 'baseline', flexWrap: 'wrap', minWidth: 0 }}
            title={t('home.usage.costNote')}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
            >
              {costText}
            </Typography>
            {singleCost && (
              <Typography variant="caption" color="text.secondary">
                {shortPeriod(singleCost[0].periodStartUtc, singleCost[0].periodEndUtc, unknown)}
              </Typography>
            )}
          </Stack>
          {attentionCount > 0 && (
            <Chip
              size="small"
              color="warning"
              label={t('home.usage.attentionCount', { count: attentionCount })}
            />
          )}
          <Typography
            variant="caption"
            color={data.sync.state === 'failed' || stale ? 'warning.main' : 'text.secondary'}
            data-testid="usage-summary-status"
          >
            {t(statusKey)}
          </Typography>
        </Stack>
        <Button
          component={RouterLink}
          to="/home?view=usage"
          size="small"
          endIcon={<ArrowForward />}
          sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}
        >
          {t('home.usage.summary.open')}
        </Button>
      </Stack>
      {attentionMetrics.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={0.5}>
            {attentionMetrics.map((metric) => {
              const percentage = knownPercentage(metric);
              const label = `${metric.product} · ${metricName(metric, t)}`;
              const estimated = metric.quality === 'estimated';
              const qualityDescription = ['estimated', 'reference'].includes(metric.quality)
                ? t(`home.usage.quality.${metric.quality}`)
                : undefined;
              return (
                <ButtonBase
                  component={RouterLink}
                  to="/home?view=usage"
                  onClick={() => onSelect(metric.id)}
                  key={metric.id}
                  data-testid="usage-summary-row"
                  aria-label={
                    t('home.usage.viewTrend', { name: metric.name }) +
                    (qualityDescription ? ` · ${qualityDescription}` : '')
                  }
                  sx={{
                    display: 'block',
                    p: 1,
                    mx: -1,
                    textAlign: 'left',
                    minWidth: 0,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                    '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap title={label} sx={{ fontWeight: 500 }}>
                        {label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {estimated && metric.used !== null && Number.isFinite(metric.used) && '≈'}
                        {numberText(metric.used, unknown)} {metric.unit}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      color={percentage === null ? 'text.secondary' : `${quotaColor(metric)}.main`}
                      sx={{ flexShrink: 0, fontWeight: 600 }}
                    >
                      {percentage !== null
                        ? `${estimated ? '≈' : ''}${numberText(percentage, unknown)}%`
                        : unknown}
                    </Typography>
                  </Stack>
                  {percentage !== null && (
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, Math.max(0, percentage))}
                      color={quotaColor(metric)}
                      sx={{ mt: 0.75, height: 4, borderRadius: 1 }}
                    />
                  )}
                </ButtonBase>
              );
            })}
          </Stack>
        </>
      )}
    </Paper>
  );
}
