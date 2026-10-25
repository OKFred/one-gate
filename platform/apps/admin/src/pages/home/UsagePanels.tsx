import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  ButtonBase,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, ExpandMore, InfoOutlined } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { Metric, Overview } from './usage-types';
import {
  costStatusKeys,
  dateText,
  decimalTotal,
  groupCosts,
  hasQuota,
  metricName,
  numberText,
  quotaColor,
  shortPeriod,
  warningKey,
} from './usage-format';

export function UsageCosts({ data }: { data: Overview }) {
  const t = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const unknown = t('home.usage.unknown');
  return (
    <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {t('home.usage.costs')}
        </Typography>
        <Tooltip title={t('home.usage.costNote')}>
          <IconButton size="small" aria-label={t('home.usage.costHelp')}>
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(180px, 1fr))' },
          gap: 2,
        }}
      >
        {groupCosts(data.costs).map((costs) => (
          <Box key={costs[0].id} data-testid="usage-cost-group" sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {costs[0].currency} {decimalTotal(costs) ?? unknown}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {shortPeriod(costs[0].periodStartUtc, costs[0].periodEndUtc, unknown)}
              {' · '}
              {costStatusKeys[costs[0].status]
                ? t(costStatusKeys[costs[0].status])
                : t('home.usage.costBasisUnknown')}
            </Typography>
          </Box>
        ))}
        {data.costs.length === 0 && (
          <Typography color="text.secondary">{t('home.usage.noCosts')}</Typography>
        )}
      </Box>
      {data.costs.length > 0 && (
        <Accordion
          disableGutters
          elevation={0}
          expanded={expanded}
          onChange={(_, value) => setExpanded(value)}
          sx={{ mt: 1, '&::before': { display: 'none' } }}
        >
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 0, minHeight: 36 }}>
            <Typography variant="body2" color="text.secondary">
              {t('home.usage.chargeDetails')}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0, pb: 0 }}>
            {expanded && (
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  {t('home.usage.costNote')}
                </Typography>
                {data.costs.map((cost) => (
                  <Stack
                    key={cost.id}
                    direction="row"
                    spacing={2}
                    sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2">{cost.product}</Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        {dateText(cost.periodStartUtc, unknown)} —{' '}
                        {dateText(cost.periodEndUtc, unknown)}
                        {' · '}
                        {cost.source} ·{' '}
                        {costStatusKeys[cost.status] ? t(costStatusKeys[cost.status]) : cost.status}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ flexShrink: 0 }}>
                      {cost.currency} {cost.amount}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
}

export function UsageMetricCard({
  metric,
  selected,
  onSelect,
  onDetails,
}: {
  metric: Metric;
  selected: boolean;
  onSelect: () => void;
  onDetails: () => void;
}) {
  const t = useTranslation();
  const unknown = t('home.usage.unknown');
  const warning = warningKey(metric);
  const percentage =
    metric.used !== null &&
    Number.isFinite(metric.used) &&
    metric.percentage !== null &&
    Number.isFinite(metric.percentage)
      ? metric.percentage
      : null;
  return (
    <Paper
      variant="outlined"
      data-testid="usage-card"
      sx={{ p: 1, minWidth: 0, borderColor: selected ? 'primary.main' : 'divider' }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pl: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {metric.product} · {t(`home.usage.period.${metric.periodKind}`)}
        </Typography>
        <IconButton
          size="small"
          aria-label={t('home.usage.viewDetails', { name: metric.name })}
          onClick={onDetails}
        >
          <InfoOutlined fontSize="small" />
        </IconButton>
      </Stack>
      <ButtonBase
        onClick={onSelect}
        aria-label={t('home.usage.viewTrend', { name: metric.name })}
        aria-pressed={selected}
        sx={{
          p: 1,
          width: '100%',
          display: 'block',
          textAlign: 'left',
          borderRadius: 1,
          '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main' },
        }}
      >
        <Typography
          component="h3"
          variant="body2"
          title={metric.name}
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {metricName(metric, t)}
        </Typography>
        <Typography
          sx={{ mt: 0.5, fontSize: '1.35rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
        >
          {numberText(metric.used, unknown)}{' '}
          <Typography component="span" variant="caption" color="text.secondary">
            {metric.unit}
          </Typography>
        </Typography>
        {hasQuota(metric) ? (
          <>
            {percentage !== null && (
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, percentage))}
                color={quotaColor(metric)}
                sx={{ mt: 1, height: 5, borderRadius: 1 }}
              />
            )}
            <Stack direction="row" sx={{ mt: 0.5, justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t(`home.usage.quota.${metric.quotaKind}`)}: {numberText(metric.limit, unknown)}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600 }}
                color={`${quotaColor(metric)}.main`}
              >
                {percentage === null ? unknown : `${numberText(percentage, unknown)}%`}
              </Typography>
            </Stack>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary">
            {t('home.usage.quota.unknown')}
          </Typography>
        )}
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ mt: 0.75, flexWrap: 'wrap' }}>
          {metric.periodKind !== 'instant' &&
            metric.periodEndUtc !== null &&
            metric.periodEndUtc <= Date.now() && (
              <Chip size="small" color="warning" label={t('home.usage.previousPeriod')} />
            )}
          {metric.status === 'stale' && (
            <Chip size="small" color="warning" label={t('home.usage.coverage.stale')} />
          )}
          {['estimated', 'reference'].includes(metric.quality) && (
            <Chip
              size="small"
              variant="outlined"
              label={t(`home.usage.quality.${metric.quality}`)}
            />
          )}
          {warning && (
            <Typography variant="caption" color={`${quotaColor(metric)}.main`}>
              {t(warning)}
            </Typography>
          )}
        </Stack>
      </ButtonBase>
    </Paper>
  );
}

export function MetricDetailsDialog({
  metric,
  onClose,
}: {
  metric: Metric | undefined;
  onClose: () => void;
}) {
  const t = useTranslation();
  const unknown = t('home.usage.unknown');
  const entries = metric
    ? [
        ['home.usage.used', `${numberText(metric.used, unknown)} ${metric.unit}`],
        ['home.usage.limit', numberText(metric.limit, unknown)],
        ['home.usage.remaining', numberText(metric.remaining, unknown)],
        [
          'home.usage.periodLabel',
          `${t(`home.usage.period.${metric.periodKind}`)} · ${dateText(metric.periodStartUtc, unknown)} — ${dateText(metric.periodEndUtc, unknown)}`,
        ],
        ['home.usage.reset', dateText(metric.resetTimeUtc, unknown)],
        ['home.usage.qualityLabel', t(`home.usage.quality.${metric.quality}`)],
        ['home.usage.source', metric.source],
        ['home.usage.collected', dateText(metric.collectedTimeUtc, unknown)],
      ]
    : [];
  return (
    <Dialog
      open={Boolean(metric)}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="usage-metric-details-title"
    >
      <DialogTitle id="usage-metric-details-title" sx={{ pr: 6 }}>
        {t('home.usage.details')}
        <IconButton
          aria-label={t('common.close')}
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      {metric && (
        <DialogContent>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>
            {metric.product} · {metric.name}
          </Typography>
          <Box
            component="dl"
            sx={{ m: 0, display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: 1.5 }}
          >
            {entries.map(([key, value]) => (
              <Box key={key} sx={{ display: 'contents' }}>
                <Typography component="dt" variant="body2" color="text.secondary">
                  {t(key)}
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            {t('home.usage.exclusiveEnd')}
          </Typography>
          {metric.reason && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, overflowWrap: 'anywhere' }}
            >
              {metric.reason}
            </Typography>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}

export function UsageDetails({
  data,
  coverageExpanded,
  onCoverageChange,
}: {
  data: Overview;
  coverageExpanded: boolean;
  onCoverageChange: (expanded: boolean) => void;
}) {
  const t = useTranslation();
  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const unknown = t('home.usage.unknown');
  return (
    <Stack spacing={1} sx={{ minWidth: 0 }}>
      <Accordion
        variant="outlined"
        disableGutters
        expanded={metricsExpanded}
        onChange={(_, value) => setMetricsExpanded(value)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2">{t('home.usage.details')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {metricsExpanded && (
            <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 1000, '& td': { verticalAlign: 'top' } }}>
                <TableHead>
                  <TableRow>
                    {[
                      'metric',
                      'used',
                      'limit',
                      'remaining',
                      'periodLabel',
                      'source',
                      'qualityLabel',
                      'collected',
                    ].map((key) => (
                      <TableCell key={key}>{t(`home.usage.${key}`)}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.metrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell sx={{ minWidth: 150 }}>
                        {metric.product} · {metric.name}
                      </TableCell>
                      <TableCell>
                        {numberText(metric.used, unknown)} {metric.unit}
                      </TableCell>
                      <TableCell>{numberText(metric.limit, unknown)}</TableCell>
                      <TableCell>{numberText(metric.remaining, unknown)}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        {t(`home.usage.period.${metric.periodKind}`)}
                        <br />
                        {dateText(metric.periodStartUtc, unknown)} —{' '}
                        {dateText(metric.periodEndUtc, unknown)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 240, overflowWrap: 'anywhere' }}>
                        {metric.source}
                      </TableCell>
                      <TableCell sx={{ minWidth: 160, maxWidth: 300, overflowWrap: 'anywhere' }}>
                        {t(`home.usage.quality.${metric.quality}`)}
                        <br />
                        {metric.reason}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {dateText(metric.collectedTimeUtc, unknown)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>
      <Accordion
        variant="outlined"
        disableGutters
        expanded={coverageExpanded}
        onChange={(_, value) => onCoverageChange(value)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2">{t('home.usage.coverage')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {coverageExpanded && (
            <Stack spacing={1.5}>
              <Typography variant="body2" color="text.secondary">
                {t('home.usage.lastSuccess')}: {dateText(data.sync.lastSuccessTimeUtc, unknown)} ·{' '}
                {t('home.usage.nextRun')}: {dateText(data.sync.nextRunTimeUtc, unknown)}
              </Typography>
              {data.sync.retryTimeUtc !== null && (
                <Typography variant="body2">
                  {t('home.usage.retryTime')}: {dateText(data.sync.retryTimeUtc, unknown)}
                </Typography>
              )}
              {data.coverage.map((item, index) => (
                <Box key={`${item.product}-${index}`}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.product} · {t(`home.usage.coverage.${item.status}`)}
                  </Typography>
                  {item.reason && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {item.reason}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
