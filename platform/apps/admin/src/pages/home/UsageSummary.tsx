import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
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
  const attentionCount = data.metrics.filter((metric) => warningKey(metric) !== null).length;
  const metrics = [...data.metrics]
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

  return (
    <Paper variant="outlined" data-testid="usage-summary" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Stack spacing={2.5}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
        >
          <Typography component="h2" variant="h6" sx={{ fontWeight: 600 }}>
            Cloudflare
          </Typography>
          <Button
            component={RouterLink}
            to="/home?view=usage"
            size="small"
            endIcon={<ArrowForward />}
          >
            {t('home.usage.summary.open')}
          </Button>
        </Stack>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" title={t('home.usage.costNote')}>
              {t('home.usage.costs')}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {singleCost && amount !== null
                ? `${singleCost[0].currency} ${amount}`
                : costGroups.length > 1
                  ? t('home.usage.summary.costGroups', { count: costGroups.length })
                  : t('home.usage.summary.unavailable')}
            </Typography>
            {singleCost && (
              <Typography variant="caption" color="text.secondary">
                {shortPeriod(singleCost[0].periodStartUtc, singleCost[0].periodEndUtc, unknown)}
              </Typography>
            )}
          </Box>
          <Stack spacing={0.75} sx={{ alignItems: { xs: 'flex-start', sm: 'flex-end' } }}>
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
        </Stack>
        {metrics.length > 0 ? (
          <Stack spacing={0.5}>
            {metrics.map((metric) => {
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
                        {metric.quality === 'reference' && ` · ${qualityDescription}`}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      color={percentage === null ? 'text.secondary' : `${quotaColor(metric)}.main`}
                      sx={{ flexShrink: 0, fontWeight: 600 }}
                    >
                      {metric.status === 'stale'
                        ? t('home.usage.coverage.stale')
                        : percentage === null
                          ? hasQuota(metric)
                            ? unknown
                            : t('home.usage.quota.unknown')
                          : `${estimated ? '≈' : ''}${numberText(percentage, unknown)}%`}
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
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('home.usage.summary.noMetrics')}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
