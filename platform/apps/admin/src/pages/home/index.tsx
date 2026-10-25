import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { AutoAwesome, Refresh } from '@mui/icons-material';
import dayjs from 'dayjs';
import { overviewFn, refreshFn } from '@/api/admin/maintenance/cloudflare-usage';
import { classifyApiFailure } from '@/api/config';
import { useTranslation } from '@/hooks/useTranslation';
import { permissions, usePermission } from '@/hooks/usePermission';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';

type Overview = Awaited<ReturnType<typeof overviewFn>>['data']['data'];
type Metric = Overview['metrics'][number];
type HistoryPoint = Overview['history'][number];
type Cost = Overview['costs'][number];

const numberText = (value: number | null, unknown: string) =>
  value === null || !Number.isFinite(value)
    ? unknown
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
const dateText = (value: number | null, unknown: string) =>
  value === null ? unknown : dayjs(value).format('YYYY-MM-DD HH:mm');

function quotaColor(metric: Metric): 'error' | 'warning' | 'primary' {
  if (
    metric.percentage === null ||
    metric.quality === 'unknown' ||
    metric.quality === 'reference' ||
    metric.quotaKind === 'unknown'
  )
    return 'primary';
  if (metric.percentage >= 100) return metric.quotaKind === 'hard' ? 'error' : 'warning';
  return metric.percentage >= 80 ? 'warning' : 'primary';
}

const coverageKeys: Record<string, string> = {
  available: 'home.usage.coverage.available',
  partial: 'home.usage.coverage.partial',
  unavailable: 'home.usage.coverage.unavailable',
  unsupported: 'home.usage.coverage.unsupported',
  forbidden: 'home.usage.coverage.forbidden',
  not_configured: 'home.usage.coverage.not_configured',
  unmapped: 'home.usage.coverage.unmapped',
  stale: 'home.usage.coverage.stale',
  empty: 'home.usage.coverage.empty',
};

const costStatusKeys: Record<string, string> = {
  official_usage_cost_billed: 'home.usage.costBasis.billed',
  official_usage_cost_contracted: 'home.usage.costBasis.contracted',
  official_usage_cost_effective: 'home.usage.costBasis.effective',
  stale_official_usage_cost: 'home.usage.costBasis.stale',
};
const knownCostBases = new Set([
  'official_usage_cost_billed',
  'official_usage_cost_contracted',
  'official_usage_cost_effective',
]);

/** Sum decimal amounts without rounding through binary floating point. */
function decimalTotal(costs: Cost[]): string | null {
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

function Trend({
  points,
  title,
  unknown,
}: {
  points: HistoryPoint[];
  title: string;
  unknown: string;
}) {
  const sorted = [...points].sort((left, right) => left.dayUtc - right.dayUtc);
  const values = sorted.filter((point) => point.value !== null && Number.isFinite(point.value));
  if (values.length === 0) return <Typography color="text.secondary">{unknown}</Typography>;
  const start = sorted[0].dayUtc;
  const finish = sorted[sorted.length - 1].dayUtc;
  const maximum = Math.max(1, ...values.map((point) => point.value ?? 0));
  const minimum = Math.min(0, ...values.map((point) => point.value ?? 0));
  const x = (day: number) => 45 + (finish === start ? 0.5 : (day - start) / (finish - start)) * 610;
  const y = (value: number) => 150 - ((value - minimum) / (maximum - minimum)) * 130;
  return (
    <Box>
      <Typography variant="subtitle2">{title}</Typography>
      <Box
        component="svg"
        viewBox="0 0 700 185"
        role="img"
        aria-label={title}
        sx={{
          display: 'block',
          width: '100%',
          maxHeight: 240,
          color: 'primary.main',
          '& text': { fontSize: { xs: 20, sm: 11 } },
        }}
      >
        <path d="M45 15 V150 H655" fill="none" stroke="currentColor" opacity={0.35} />
        <text x="40" y="15" textAnchor="end" fill="currentColor" fontSize="11">
          {numberText(maximum, unknown)}
        </text>
        <text x="40" y="150" textAnchor="end" fill="currentColor" fontSize="11">
          {numberText(minimum, unknown)}
        </text>
        {sorted.map((point, index) => {
          if (point.value === null || !Number.isFinite(point.value)) return null;
          const previous = sorted[index - 1];
          return (
            <g key={`${point.dayUtc}-${index}`}>
              {previous &&
                previous.value !== null &&
                Number.isFinite(previous.value) &&
                point.dayUtc - previous.dayUtc <= 86_400_000 && (
                  <line
                    x1={x(previous.dayUtc)}
                    y1={y(previous.value)}
                    x2={x(point.dayUtc)}
                    y2={y(point.value)}
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                )}
              <circle cx={x(point.dayUtc)} cy={y(point.value)} r="4" fill="currentColor">
                <title>{`${dayjs(point.dayUtc).format('YYYY-MM-DD')}: ${numberText(point.value, unknown)}`}</title>
              </circle>
            </g>
          );
        })}
        <text x="45" y="175" fill="currentColor" fontSize="11">
          {dayjs(start).format('MM-DD')}
        </text>
        <text x="655" y="175" textAnchor="end" fill="currentColor" fontSize="11">
          {dayjs(finish).format('MM-DD')}
        </text>
      </Box>
    </Box>
  );
}

export default function HomePage() {
  const t = useTranslation();
  const { permissionCodes, loading: permissionsLoading } = usePermission();
  const allowed = permissionCodes.has(permissions.admin.maintenance.cloudflare_usage.read);
  const mayRefresh =
    allowed && permissionCodes.has(permissions.admin.maintenance.cloudflare_usage.update);
  const chatAllowed = permissionCodes.has(permissions.admin.ai.chat.read);
  const [data, setData] = useState<Overview | null>(null);
  const [days, setDays] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [metricId, setMetricId] = useState('');
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const refreshLock = useRef(false);
  const refreshController = useRef<AbortController | null>(null);
  const unknown = t('home.usage.unknown');

  useEffect(() => {
    const requestGeneration = ++generation.current;
    const auth = captureAuthSession();
    const abort = new AbortController();
    const current = () => generation.current === requestGeneration && isCurrentAuthSession(auth);
    if (!allowed) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(undefined);
    void overviewFn({
      data: { days },
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setError(t('home.usage.loadFailed'));
            return;
          }
          setData(response.data.data);
        },
        (failure: unknown) => {
          if (current() && classifyApiFailure(failure).kind !== 'session')
            setError(t('home.usage.loadFailed'));
        },
      )
      .finally(() => {
        if (current()) setLoading(false);
      });
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(auth)) return;
      generation.current += 1;
      abort.abort();
      refreshController.current?.abort();
      refreshLock.current = false;
      setData(null);
      setError(undefined);
      setRefreshMessage(undefined);
      setRefreshing(false);
      setLoading(false);
    });
    return () => {
      generation.current += 1;
      abort.abort();
      refreshController.current?.abort();
      unsubscribe();
    };
  }, [allowed, days, revision, t]);

  const refresh = async () => {
    if (!mayRefresh || refreshLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    setRefreshMessage(undefined);
    setError(undefined);
    const auth = captureAuthSession();
    const requestGeneration = generation.current;
    const abort = new AbortController();
    refreshController.current = abort;
    const current = () =>
      generation.current === requestGeneration &&
      isCurrentAuthSession(auth) &&
      !abort.signal.aborted;
    await refreshFn({
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true) {
            setError(t('home.usage.refreshFailed'));
            return;
          }
          setRefreshMessage(
            response.data.data.accepted
              ? t('home.usage.refreshQueued')
              : `${t('home.usage.refreshLater')} ${dateText(response.data.data.eligibleTimeUtc, unknown)}`,
          );
          setRevision((value) => value + 1);
        },
        (failure: unknown) => {
          if (current() && classifyApiFailure(failure).kind !== 'session')
            setError(t('home.usage.refreshFailed'));
        },
      )
      .finally(() => {
        refreshLock.current = false;
        if (isCurrentAuthSession(auth)) setRefreshing(false);
      });
  };

  const costGroups = new Map<string, Cost[]>();
  for (const cost of data?.costs ?? []) {
    // A known currency and period do not make billed, contracted and amortized costs additive.
    const key =
      knownCostBases.has(cost.status) && cost.periodStartUtc !== null && cost.periodEndUtc !== null
        ? JSON.stringify([cost.currency, cost.periodStartUtc, cost.periodEndUtc, cost.status])
        : JSON.stringify([cost.id]);
    const group = costGroups.get(key) ?? [];
    group.push(cost);
    costGroups.set(key, group);
  }
  const historyMetrics =
    data?.metrics.filter((metric) => data.history.some((point) => point.metricId === metric.id)) ??
    [];
  const selectedMetric =
    historyMetrics.find((metric) => metric.id === metricId) ?? historyMetrics[0];
  const selectedHistory =
    data?.history.filter((point) => point.metricId === selectedMetric?.id) ?? [];

  return (
    <Stack
      spacing={3}
      sx={{
        maxWidth: 1500,
        mx: 'auto',
        minWidth: 0,
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' } }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">{t('home.title')}</Typography>
          <Typography color="text.secondary">
            {allowed ? t('home.usage.subtitle') : t('home.subtitle')}
          </Typography>
        </Box>
        {chatAllowed && (
          <Button
            component={RouterLink}
            to="/admin/ai/chat"
            startIcon={<AutoAwesome />}
            variant="outlined"
          >
            {t('home.openChat')}
          </Button>
        )}
      </Stack>
      {!allowed && !permissionsLoading && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography>{t('home.welcome')}</Typography>
        </Paper>
      )}
      {allowed && (
        <>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
          >
            <Typography variant="h5">{t('home.usage.title')}</Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ToggleButtonGroup
                exclusive
                value={days}
                size="small"
                aria-label={t('home.usage.range')}
                onChange={(_, value: 7 | 30 | null) => {
                  if (value !== null) setDays(value);
                }}
              >
                <ToggleButton value={7}>{t('home.usage.days7')}</ToggleButton>
                <ToggleButton value={30}>{t('home.usage.days30')}</ToggleButton>
              </ToggleButtonGroup>
              {mayRefresh && (
                <Button
                  variant="contained"
                  startIcon={
                    refreshing ? <CircularProgress size={16} color="inherit" /> : <Refresh />
                  }
                  disabled={refreshing || loading}
                  onClick={() => void refresh()}
                >
                  {t('home.usage.refresh')}
                </Button>
              )}
            </Stack>
          </Stack>
          {loading && <LinearProgress aria-label={t('home.usage.loading')} />}
          {error && <Alert severity="error">{error}</Alert>}
          {refreshMessage && <Alert severity="info">{refreshMessage}</Alert>}
          {data && (
            <>
              {data.configuration !== 'configured' && (
                <Alert severity="info">{t(`home.usage.configuration.${data.configuration}`)}</Alert>
              )}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: 'wrap', alignItems: 'center' }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    {data.account?.name ?? data.account?.id ?? t('home.usage.noAccount')}
                  </Typography>
                  <Chip
                    size="small"
                    label={t(`home.usage.sync.${data.sync.state}`)}
                    color={
                      data.sync.state === 'failed'
                        ? 'error'
                        : data.sync.state === 'partial'
                          ? 'warning'
                          : 'default'
                    }
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t('home.usage.collected')}: {dateText(data.collectedTimeUtc, unknown)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('home.usage.lastSuccess')}: {dateText(data.sync.lastSuccessTimeUtc, unknown)} ·{' '}
                  {t('home.usage.nextRun')}: {dateText(data.sync.nextRunTimeUtc, unknown)}
                </Typography>
                {data.sync.retryTimeUtc !== null && (
                  <Typography variant="body2" color="text.secondary">
                    {t('home.usage.retryTime')}: {dateText(data.sync.retryTimeUtc, unknown)}
                  </Typography>
                )}
                {['partial', 'failed'].includes(data.sync.state) && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {t('home.usage.stale')}
                  </Alert>
                )}
              </Paper>
              <Box>
                <Typography variant="h6">{t('home.usage.costs')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {t('home.usage.costNote')}
                </Typography>
                <Stack spacing={2}>
                  {[...costGroups.entries()].map(([key, costs]) => (
                    <Paper
                      variant="outlined"
                      sx={{ p: 2 }}
                      key={key}
                      data-testid="usage-cost-group"
                    >
                      <Typography sx={{ fontWeight: 600 }}>
                        {costs[0].currency} {decimalTotal(costs) ?? unknown}
                      </Typography>
                      {costStatusKeys[costs[0].status] && (
                        <Typography variant="body2">
                          {t(costStatusKeys[costs[0].status])}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {dateText(costs[0].periodStartUtc, unknown)} —{' '}
                        {dateText(costs[0].periodEndUtc, unknown)}
                      </Typography>
                      {costs.map((cost) => (
                        <Stack
                          key={cost.id}
                          direction="row"
                          sx={{ mt: 1, justifyContent: 'space-between', gap: 2 }}
                        >
                          <Box>
                            <Typography variant="body2">{cost.product}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {cost.source} ·{' '}
                              {costStatusKeys[cost.status]
                                ? t(costStatusKeys[cost.status])
                                : cost.status}
                            </Typography>
                          </Box>
                          <Typography variant="body2">
                            {cost.currency} {cost.amount}
                          </Typography>
                        </Stack>
                      ))}
                    </Paper>
                  ))}
                  {data.costs.length === 0 && (
                    <Typography color="text.secondary">{t('home.usage.noCosts')}</Typography>
                  )}
                </Stack>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                    xl: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                {data.metrics.map((metric) => (
                  <Paper variant="outlined" key={metric.id} sx={{ p: 2 }} data-testid="usage-card">
                    <Typography variant="caption" color="text.secondary">
                      {metric.product}
                    </Typography>
                    <Typography variant="h6">{metric.name}</Typography>
                    <Typography sx={{ mt: 1 }}>
                      {numberText(metric.used, unknown)} {metric.unit}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Chip size="small" label={t(`home.usage.quota.${metric.quotaKind}`)} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={t(`home.usage.quality.${metric.quality}`)}
                      />
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {t('home.usage.limit')}: {numberText(metric.limit, unknown)} ·{' '}
                      {t('home.usage.remaining')}: {numberText(metric.remaining, unknown)}
                    </Typography>
                    {metric.percentage !== null &&
                      metric.quotaKind !== 'unknown' &&
                      !['unknown', 'reference'].includes(metric.quality) && (
                        <>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, Math.max(0, metric.percentage))}
                            color={quotaColor(metric)}
                            sx={{ mt: 1, height: 6, borderRadius: 1 }}
                          />
                          <Typography
                            variant="body2"
                            color={`${quotaColor(metric)}.main`}
                            sx={{ mt: 0.5 }}
                          >
                            {numberText(metric.percentage, unknown)}%
                            {metric.percentage >= 100
                              ? ` · ${t(metric.quotaKind === 'hard' ? 'home.usage.hardReached' : metric.quotaKind === 'capacity' ? 'home.usage.capacityReached' : 'home.usage.includedExceeded')}`
                              : metric.percentage >= 80
                                ? ` · ${t('home.usage.highUsage')}`
                                : ''}
                          </Typography>
                        </>
                      )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      {t(`home.usage.period.${metric.periodKind}`)} ·{' '}
                      {dateText(metric.periodStartUtc, unknown)} —{' '}
                      {dateText(metric.periodEndUtc, unknown)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {t('home.usage.reset')}: {dateText(metric.resetTimeUtc, unknown)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {metric.source} · {metric.status}
                    </Typography>
                    {metric.reason && (
                      <Typography variant="body2" color="text.secondary">
                        {metric.reason}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
              {data.metrics.length === 0 && (
                <Alert severity="info">{t('home.usage.noMetrics')}</Alert>
              )}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {t('home.usage.trend')}
                </Typography>
                {selectedMetric ? (
                  <>
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel id="trend-metric-label">{t('home.usage.metric')}</InputLabel>
                      <Select
                        labelId="trend-metric-label"
                        label={t('home.usage.metric')}
                        value={selectedMetric.id}
                        onChange={(event) => setMetricId(event.target.value)}
                      >
                        {historyMetrics.map((metric) => (
                          <MenuItem value={metric.id} key={metric.id}>
                            {metric.product} · {metric.name} ({metric.unit})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {(['daily_usage', 'cumulative_snapshot'] as const).map(
                      (kind) =>
                        selectedHistory.some((point) => point.kind === kind) && (
                          <Trend
                            key={kind}
                            points={selectedHistory.filter((point) => point.kind === kind)}
                            title={`${t(`home.usage.history.${kind}`)} (${selectedMetric.unit})`}
                            unknown={unknown}
                          />
                        ),
                    )}
                  </>
                ) : (
                  <Typography color="text.secondary">{t('home.usage.noHistory')}</Typography>
                )}
              </Paper>
              <Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {t('home.usage.details')}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small" sx={{ minWidth: 920 }}>
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
                          <TableCell>
                            {metric.product} · {metric.name}
                          </TableCell>
                          <TableCell>
                            {numberText(metric.used, unknown)} {metric.unit}
                          </TableCell>
                          <TableCell>{numberText(metric.limit, unknown)}</TableCell>
                          <TableCell>{numberText(metric.remaining, unknown)}</TableCell>
                          <TableCell>
                            {t(`home.usage.period.${metric.periodKind}`)}
                            <br />
                            {dateText(metric.periodStartUtc, unknown)} —{' '}
                            {dateText(metric.periodEndUtc, unknown)}
                          </TableCell>
                          <TableCell>{metric.source}</TableCell>
                          <TableCell>
                            {t(`home.usage.quality.${metric.quality}`)}
                            <br />
                            {metric.reason}
                          </TableCell>
                          <TableCell>{dateText(metric.collectedTimeUtc, unknown)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {t('home.usage.coverage')}
                </Typography>
                <Stack spacing={1}>
                  {data.coverage.map((item, index) => (
                    <Box key={`${item.product}-${index}`}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.product} ·{' '}
                        {coverageKeys[item.status] ? t(coverageKeys[item.status]) : item.status}
                      </Typography>
                      {item.reason && (
                        <Typography variant="body2" color="text.secondary">
                          {item.reason}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </>
          )}
        </>
      )}
    </Stack>
  );
}
